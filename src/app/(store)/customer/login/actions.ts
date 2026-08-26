'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export async function loginCustomer(formData: FormData) {
  const email = formData.get('email') as string;
  if (!email) return { error: 'Email is required' };

  const cookieStore = await cookies();
  cookieStore.set('customer_session', email, { 
    httpOnly: true, 
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7, // 1 week
    path: '/',
  });
  
  redirect('/customer');
}
