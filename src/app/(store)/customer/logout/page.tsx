import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function LogoutPage() {
  const cookieStore = await cookies();
  cookieStore.delete('customer_session');
  redirect('/');
}
