import midtransClient from 'midtrans-client';

const snap = new midtransClient.Snap({
  isProduction: false,
  serverKey: process.env.MIDTRANS_SERVER_KEY,
});

export async function POST(request) {
  try {
    const body = await request.json();
    const { orderId, amount, customerName, customerEmail, customerPhone, items } = body;

    const parameter = {
      transaction_details: {
        order_id: orderId,
        gross_amount: amount,
      },
      customer_details: {
        first_name: customerName,
        email: customerEmail,
        phone: customerPhone,
      },
      item_details: items,
    };

    const transaction = await snap.createTransaction(parameter);

    return Response.json({ 
      token: transaction.token,
      redirect_url: transaction.redirect_url 
    });

  } catch (error) {
    console.error('Midtrans error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}