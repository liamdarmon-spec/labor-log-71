import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { documentId } = await req.json();
    
    if (!documentId) {
      throw new Error('Document ID is required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch document metadata
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (docError || !document) {
      throw new Error('Document not found');
    }

    // Update status to pending
    await supabase
      .from('documents')
      .update({ ai_last_run_status: 'pending', ai_last_run_at: new Date().toISOString() })
      .eq('id', documentId);

    // Prepare AI prompt based on document type and name
    const systemPrompt = `You are a construction document analyzer. Extract key information from documents like contracts, invoices, COIs, W-9s, licenses, etc.

Extract and return JSON with these fields:
{
  "title": "Human-readable document title",
  "type": "subcontract | invoice | change_order | COI | W9 | license | receipt | plan_set | photo | other",
  "counterparty_name": "Sub/vendor/client name",
  "effective_date": "YYYY-MM-DD or null",
  "expiration_date": "YYYY-MM-DD or null",
  "total_amount": number or null,
  "currency": "USD | CAD | EUR | etc",
  "status": "draft | signed | expired | active",
  "tags": ["tag1", "tag2"],
  "extracted_text_summary": "Brief summary of key content (max 500 chars)"
}

For COI documents: focus on coverage types, limits, and expiration.
For W-9 documents: extract EIN, business name, address.
For invoices: extract invoice number, date, amount, line items summary.
For contracts: extract parties, scope, value, dates.`;

    const userPrompt = `Analyze this document:
- File name: ${document.file_name}
- Existing type hint: ${document.doc_type || 'unknown'}
- Existing vendor: ${document.vendor_name || 'unknown'}
- Owner type: ${document.owner_type || 'unknown'}

Extract key information and return as JSON.`;

    // Call Lovable AI Gateway
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        response_format: { type: "json_object" }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      
      // Update document with error status
      await supabase
        .from('documents')
        .update({ 
          ai_last_run_status: `error: ${aiResponse.status}`,
          ai_last_run_at: new Date().toISOString()
        })
        .eq('id', documentId);

      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const extracted = JSON.parse(aiData.choices[0].message.content);

    // Update document with AI results
    const updateData = {
      ai_title: extracted.title || null,
      ai_doc_type: extracted.type || null,
      ai_counterparty_name: extracted.counterparty_name || null,
      ai_effective_date: extracted.effective_date || null,
      ai_expiration_date: extracted.expiration_date || null,
      ai_total_amount: extracted.total_amount || null,
      ai_currency: extracted.currency || 'USD',
      ai_status: extracted.status || null,
      ai_tags: extracted.tags || [],
      ai_summary: extracted.extracted_text_summary || null,
      ai_last_run_at: new Date().toISOString(),
      ai_last_run_status: 'success',
      ai_extracted_data: extracted,
    };

    const { error: updateError } = await supabase
      .from('documents')
      .update(updateData)
      .eq('id', documentId);

    if (updateError) {
      throw updateError;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        documentId,
        extracted: updateData 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-document function:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});