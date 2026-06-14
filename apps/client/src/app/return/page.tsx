import Link from "next/link";

const ReturnPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ order_id: string }> | undefined;
}) => {
  const order_id = (await searchParams)?.order_id;

  if (!order_id) {
    return <div>No order id found!</div>;
  }

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_PAYMENT_SERVICE_URL}/sessions/${order_id}`
  );
  const data = await res.json();

  return (
    <div className="">
      <h1>Payment {data.status}</h1>
      <p>Payment status: {data.paymentStatus}</p>
      <Link href="/orders">See your orders</Link>
    </div>
  );
};

export default ReturnPage;
