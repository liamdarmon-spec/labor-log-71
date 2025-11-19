import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.83.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting conversion of past schedules to time logs...');

    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];

    // Find all schedules that are in the past or today and haven't been converted yet
    const { data: pastSchedules, error: fetchError } = await supabase
      .from('scheduled_shifts')
      .select('*')
      .lte('scheduled_date', today)
      .eq('converted_to_timelog', false);

    if (fetchError) {
      console.error('Error fetching past schedules:', fetchError);
      throw fetchError;
    }

    if (!pastSchedules || pastSchedules.length === 0) {
      console.log('No past schedules to convert');
      return new Response(
        JSON.stringify({ message: 'No past schedules to convert', count: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    console.log(`Found ${pastSchedules.length} schedules to convert`);

    // Create time log entries from past schedules with schedule_id link
    const timeLogEntries = pastSchedules.map(schedule => ({
      worker_id: schedule.worker_id,
      project_id: schedule.project_id,
      trade_id: schedule.trade_id,
      date: schedule.scheduled_date,
      hours_worked: schedule.scheduled_hours,
      notes: schedule.notes,
      created_by: schedule.created_by,
      schedule_id: schedule.id
    }));

    // Insert time logs - filter out any that already have a schedule_id link
    const { data: existingLogs } = await supabase
      .from('daily_logs')
      .select('schedule_id')
      .in('schedule_id', pastSchedules.map(s => s.id));

    const existingScheduleIds = new Set(existingLogs?.map(log => log.schedule_id).filter(Boolean) || []);
    const newTimeLogEntries = timeLogEntries.filter(entry => !existingScheduleIds.has(entry.schedule_id));

    if (newTimeLogEntries.length > 0) {
      const { error: insertError } = await supabase
        .from('daily_logs')
        .insert(newTimeLogEntries);

      if (insertError) {
        console.error('Error inserting time logs:', insertError);
        throw insertError;
      }
    }

    // Mark schedules as converted
    const scheduleIds = pastSchedules.map(s => s.id);
    const { error: updateError } = await supabase
      .from('scheduled_shifts')
      .update({ converted_to_timelog: true })
      .in('id', scheduleIds);

    if (updateError) {
      console.error('Error updating schedules:', updateError);
      throw updateError;
    }

    console.log(`Successfully converted ${pastSchedules.length} schedules to time logs`);

    return new Response(
      JSON.stringify({ 
        message: 'Successfully converted past schedules to time logs',
        count: pastSchedules.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Error in convert-past-schedules function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
