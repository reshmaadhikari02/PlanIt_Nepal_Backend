const stripeClient = require('../config/stripeConfig');
const Order = require('../models/order');
const { sendOrderConfirmationEmail } = require('../utils/emailHelper');

exports.startPayment = async (req, res) => {
  const { orderId, paymentAmount } = req.body;
  const userId = req.user.id;
  try {
    const order = await Order.findById(orderId).populate('userId');
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }
    if (order.userId._id.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "You can only make payments for your own orders"
      });
    }
    if (!paymentAmount) {
      order.paymentType = 'cash_after_service';
      order.status = 'confirmed';
      order.paymentStatus = 'pending';
      order.items.forEach(item => {
        if (item.itemType === 'venue' || item.itemType === 'studio') {
          item.bookingStatus = 'confirmed';
        }
      });
      await order.save();
      try {
        await sendOrderConfirmationEmail({ order, user: order.userId }, 'cash_payment');
      } catch (emailError) {}
      return res.status(200).json({
        success: true,
        message: "Order confirmed for cash payment after service",
        sessionUrl: null,
        sessionId: null,
        order: {
          _id: order._id,
          status: order.status,
          totalAmount: order.totalAmount,
          paymentType: order.paymentType,
          paymentStatus: order.paymentStatus,
          items: order.items
        }
      });
    }
    order.paymentType = 'advance_payment';
    await order.save();
    let amount;
    let paymentAmountType;
    if (paymentAmount === '25_percent') {
      amount = Math.round(order.totalAmount * 0.25 * 100);
      paymentAmountType = 'advance_payment';
    } else if (paymentAmount === 'full_payment') {
      amount = Math.round(order.totalAmount * 100);
      paymentAmountType = 'full_payment';
    } else {
      return res.status(400).json({
        success: false,
        message: "Invalid paymentAmount. Use '25_percent' or 'full_payment'"
      });
    }
    if (amount < 50) {
      return res.status(400).json({
        success: false,
        message: "Payment amount must be at least $0.50"
      });
    }
    const session = await stripeClient.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: order.userId.email,
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `PlanIt_Nepal Order - ${order._id}`,
            description: `Payment for order containing ${order.items.length} items${paymentAmount === '25_percent' ? ' (25% Advance Payment)' : ' (Full Payment)'}`
          },
          unit_amount: amount,
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL}/order-success`,
      cancel_url: `${process.env.FRONTEND_URL}/payment-cancel`,
      metadata: {
        orderId: order._id.toString(),
        userId: userId,
        paymentAmountType: paymentAmountType
      }
    });
    return res.status(200).json({
      success: true,
      sessionUrl: session.url,
      sessionId: session.id,
      message: "Payment session created successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

exports.checkPaymentStatus = async (req, res) => {
  const { sessionId } = req.params;
  const userId = req.user.id;
  try {
    const session = await stripeClient.checkout.sessions.retrieve(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Payment session not found"
      });
    }
    if (session.metadata.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: "You can only check your own payment status"
      });
    }
    const order = await Order.findById(session.metadata.orderId).populate('userId');
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }
    let orderStatus = 'pending';
    let paymentStatus = 'pending';
    if (session.payment_status === 'paid') {
      orderStatus = 'confirmed';
      if (session.metadata.paymentAmountType === 'advance_payment') {
        paymentStatus = 'partial';
        order.paidAmount = parseFloat((session.amount_total / 100).toFixed(2));
        order.remainingAmount = parseFloat((order.totalAmount - order.paidAmount).toFixed(2));
      } else {
        paymentStatus = 'completed';
        order.paidAmount = order.totalAmount;
        order.remainingAmount = 0;
      }
      order.paymentStatus = paymentStatus;
      order.status = orderStatus;
      order.stripePaymentIntentId = session.payment_intent;
      await order.save();
    }
    res.status(200).json({
      success: true,
      paymentStatus: session.payment_status,
      orderStatus: orderStatus,
      order: {
        _id: order._id,
        status: order.status,
        totalAmount: order.totalAmount,
        paidAmount: order.paidAmount,
        remainingAmount: order.remainingAmount,
        paymentStatus: order.paymentStatus,
        paymentType: order.paymentType,
        items: order.items
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

exports.handleStripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripeClient.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const orderId = session.metadata.orderId;
    const paymentAmountType = session.metadata.paymentAmountType;
    try {
      const order = await Order.findById(orderId).populate('userId');
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }
      let orderStatus = 'confirmed';
      let paymentStatus = 'pending';
      if (paymentAmountType === 'advance_payment') {
        paymentStatus = 'partial';
        order.paidAmount = parseFloat((session.amount_total / 100).toFixed(2));
        order.remainingAmount = parseFloat((order.totalAmount - order.paidAmount).toFixed(2));
      } else {
        paymentStatus = 'completed';
        order.paidAmount = order.totalAmount;
        order.remainingAmount = 0;
      }
      order.paymentStatus = paymentStatus;
      order.status = orderStatus;
      order.stripePaymentIntentId = session.payment_intent;
      order.items.forEach(item => {
        if (item.itemType === 'venue' || item.itemType === 'studio') {
          item.bookingStatus = 'confirmed';
        }
      });
      await order.save();
      try {
        const emailPaymentType = paymentAmountType === 'advance_payment' ? '25_percent' : 'full_payment';
        await sendOrderConfirmationEmail({ order, user: order.userId }, emailPaymentType);
      } catch (emailError) {}
    } catch (error) {}
  }
  res.json({ received: true });
};
