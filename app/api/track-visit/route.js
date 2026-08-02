import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export async function POST() {
  try {
    const { data, error } = await supabaseAdmin.rpc('increment_site_visits');
    if (error) throw error;
    return NextResponse.json({ totalVisits: data });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
