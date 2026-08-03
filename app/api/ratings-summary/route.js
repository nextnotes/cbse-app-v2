import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('feedback')
      .select('rating')
      .not('rating', 'is', null);
    if (error) throw error;

    const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    let sum = 0;
    (data || []).forEach((r) => {
      if (r.rating >= 1 && r.rating <= 5) {
        counts[r.rating] += 1;
        sum += r.rating;
      }
    });
    const total = data ? data.length : 0;
    const average = total > 0 ? sum / total : 0;

    return NextResponse.json({ average, total, counts });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
