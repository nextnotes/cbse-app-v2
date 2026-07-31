import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export async function POST(request) {
  const { name, grade } = await request.json();

  if (!name || !grade) {
    return NextResponse.json({ error: 'Name and grade are required.' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('unique_id')
    .ilike('name', name.trim())
    .eq('grade', grade)
    .eq('role', 'student');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data || data.length === 0) {
    return NextResponse.json(
      { error: 'No account found with that name and grade.' },
      { status: 404 }
    );
  }

  const matches = data.map((row) => row.unique_id);

  return NextResponse.json({ matches });
}
