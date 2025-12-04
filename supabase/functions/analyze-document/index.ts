import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper to convert ArrayBuffer to base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Detect if file is an image based on mime type or extension
function isImageFile(mimeType: string | null, fileName: string): boolean {
  if (mimeType?.startsWith('image/')) return true;
  const ext = fileName.toLowerCase().split('.').pop();
  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext || '');
}

// Detect if file is a PDF
function isPdfFile(mimeType: string | null, fileName: string): boolean {
  if (mimeType === 'application/pdf') return true;
  return fileName.toLowerCase().endsWith('.pdf');
}

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

    console.log('Analyzing document:', document.file_name, 'storage_path:', document.storage_path);

    // Update status to pending
    await supabase
      .from('documents')
      .update({ ai_last_run_status: 'pending', ai_last_run_at: new Date().toISOString() })
      .eq('id', documentId);

    // Try to download the actual file content
    let fileContentBase64: string | null = null;
    let fileContentText: string | null = null;
    let mimeType = document.mime_type || '';
    const isImage = isImageFile(mimeType, document.file_name);
    const isPdf = isPdfFile(mimeType, document.file_name);

    // Attempt to download file from storage
    if (document.storage_path) {
      try {
        // Extract bucket and path from storage_path
        // Format could be: "bucket/path/to/file" or just the path if bucket is known
        const storagePath = document.storage_path;
        const pathParts = storagePath.split('/');
        const bucket = pathParts[0] || 'documents';
        const filePath = pathParts.slice(1).join('/') || storagePath;

        console.log('Downloading from bucket:', bucket, 'path:', filePath);

        const { data: fileData, error: downloadError } = await supabase.storage
          .from(bucket)
          .download(filePath);

        if (downloadError) {
          console.error('Download error:', downloadError);
        } else if (fileData) {
          const buffer = await fileData.arrayBuffer();
          fileContentBase64 = arrayBufferToBase64(buffer);
          mimeType = fileData.type || mimeType;
          console.log('File downloaded, size:', buffer.byteLength, 'type:', mimeType);
        }
      } catch (downloadErr) {
        console.error('Failed to download file:', downloadErr);
      }
    }

    // Prepare AI messages
    const systemPrompt = `You are a construction document analyzer. Extract key information from documents like contracts, invoices, COIs (Certificate of Insurance), W-9s, licenses, receipts, etc.

Extract and return JSON with these fields:
{
  "title": "Human-readable document title (extract from content, not just filename)",
  "type": "subcontract | invoice | change_order | COI | W9 | license | receipt | plan_set | photo | proposal | estimate | permit | warranty | lien_waiver | other",
  "counterparty_name": "Subcontractor/vendor/client/company name if visible",
  "effective_date": "YYYY-MM-DD or null",
  "expiration_date": "YYYY-MM-DD or null", 
  "total_amount": number or null (extract dollar amounts),
  "currency": "USD",
  "status": "draft | signed | expired | active | null",
  "tags": ["relevant", "tags", "from", "content"],
  "extracted_text_summary": "Detailed summary of key content (up to 500 chars). Include important details like policy numbers, invoice numbers, amounts, parties, dates."
}

Guidelines:
- For COI: extract insurance company, policy numbers, coverage limits, certificate holder, insured party
- For W-9: extract business name, EIN/SSN (masked), address, tax classification
- For invoices: extract invoice number, date, vendor, amount, line items summary
- For contracts: extract parties, scope summary, contract value, key dates
- For receipts: extract store/vendor, items purchased, total amount, date
- If content is unclear or minimal, explain what you can/cannot determine in the summary.`;

    let messages: any[] = [{ role: 'system', content: systemPrompt }];

    // Build user message based on available content
    if (isImage && fileContentBase64) {
      // Use vision capabilities for images
      console.log('Using vision mode for image analysis');
      messages.push({
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Analyze this construction document image. File name: ${document.file_name}. Extract all visible text and key information.`
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:${mimeType || 'image/jpeg'};base64,${fileContentBase64}`
            }
          }
        ]
      });
    } else if (isPdf && fileContentBase64) {
      // PDFs: Currently Gemini doesn't directly support PDF. Include metadata and note limitation.
      console.log('PDF detected - analyzing with metadata only (PDF text extraction not available)');
      messages.push({
        role: 'user',
        content: `Analyze this PDF document based on available context:
- File name: ${document.file_name}
- Existing type hint: ${document.doc_type || 'unknown'}
- Existing vendor: ${document.vendor_name || 'unknown'}
- Owner type: ${document.owner_type || 'unknown'}
- File size: ${document.file_size || document.size_bytes || 'unknown'} bytes

Note: Direct PDF text extraction is not currently available. Please analyze based on the filename and any context clues. If the filename contains numbers that could be invoice numbers, dates, or vendor codes, try to interpret them.

If you cannot determine meaningful information, set type to "other" and explain in the summary that the document requires manual review.`
      });
    } else {
      // Fallback: metadata only
      console.log('Using metadata-only analysis');
      messages.push({
        role: 'user',
        content: `Analyze this document based on available metadata:
- File name: ${document.file_name}
- Existing type hint: ${document.doc_type || 'unknown'}
- Existing vendor: ${document.vendor_name || 'unknown'}
- Owner type: ${document.owner_type || 'unknown'}
- Description: ${document.description || 'none'}
- Notes: ${document.notes || 'none'}

Extract any information you can infer from the filename and context. If the filename appears to be a code or number without clear meaning, explain this in the summary.`
      });
    }

    // Call Lovable AI Gateway
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages,
        response_format: { type: "json_object" }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      
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
    console.log('AI response received');
    
    let extracted;
    try {
      extracted = JSON.parse(aiData.choices[0].message.content);
    } catch (parseError) {
      console.error('Failed to parse AI response:', aiData.choices[0].message.content);
      extracted = {
        title: document.file_name,
        type: 'other',
        extracted_text_summary: 'AI returned unparseable response. Manual review required.'
      };
    }

    // Update document with AI results
    const analysisNote = isPdf && !fileContentText 
      ? ' (Note: PDF text extraction not available - analysis based on filename only)'
      : '';
    
    const updateData = {
      ai_title: extracted.title || document.file_name,
      ai_doc_type: extracted.type || 'other',
      ai_counterparty_name: extracted.counterparty_name || null,
      ai_effective_date: extracted.effective_date || null,
      ai_expiration_date: extracted.expiration_date || null,
      ai_total_amount: extracted.total_amount || null,
      ai_currency: extracted.currency || 'USD',
      ai_status: extracted.status || null,
      ai_tags: extracted.tags || [],
      ai_summary: (extracted.extracted_text_summary || 'No summary available') + analysisNote,
      ai_last_run_at: new Date().toISOString(),
      ai_last_run_status: 'success',
      ai_extracted_data: {
        ...extracted,
        analysis_mode: isImage ? 'vision' : (isPdf ? 'metadata_only_pdf' : 'metadata_only'),
        file_downloaded: !!fileContentBase64
      },
    };

    const { error: updateError } = await supabase
      .from('documents')
      .update(updateData)
      .eq('id', documentId);

    if (updateError) {
      throw updateError;
    }

    console.log('Document updated successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        documentId,
        extracted: updateData,
        analysisMode: isImage ? 'vision' : (isPdf ? 'metadata_only' : 'metadata_only')
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
