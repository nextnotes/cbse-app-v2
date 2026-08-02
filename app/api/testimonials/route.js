import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('feedback')
      .select('display_name, mood, rating, message, created_at')
      .eq('approved', true)
      .not('message', 'is', null)
      .order('created_at', { ascending: false })
      .limit(12);

    if (error) throw error;
    return NextResponse.json({ testimonials: data || [] });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
