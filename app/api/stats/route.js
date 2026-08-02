import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export async function GET() {
  try {
    const [studentsRes, visitsRes] = await Promise.all([
      supabaseAdmin.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'student'),
      supabaseAdmin.from('site_stats').select('total_visits').eq('id', 1).single(),
    ]);

    return NextResponse.json({
      totalStudents: studentsRes.count || 0,
      totalVisitors: visitsRes.data?.total_visits || 0,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
