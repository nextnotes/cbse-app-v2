import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export async function POST(request) {
  const { name, uniqueId, newPassword } = await request.json();

  if (!name || !uniqueId || !newPassword) {
    return NextResponse.json({ error: 'All fields are required.' }, { status: 400 });
  }
  if (newPassword.length < 6) {
    return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 });
  }

  // Verify name + unique_id match a real profile before touching any password
  const { data: profile, error: findError } = await supabaseAdmin
    .from('profiles')
    .select('id, name')
    .eq('unique_id', uniqueId.trim())
    .ilike('name', name.trim())
    .maybeSingle();

  if (findError) {
    return NextResponse.json({ error: findError.message }, { status: 500 });
  }
  if (!profile) {
    return NextResponse.json(
      { error: 'Name and Unique ID do not match any account.' },
      { status: 404 }
    );
  }

  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(profile.id, {
    password: newPassword,
  });

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
