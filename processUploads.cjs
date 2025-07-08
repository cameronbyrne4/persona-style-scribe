require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const pdfParse = require('pdf-parse');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const BUCKET = 'user-uploads';

async function processFiles() {
  // List all files in the bucket
  const { data: files, error } = await supabase.storage.from(BUCKET).list('', { limit: 100, offset: 0, sortBy: { column: 'created_at', order: 'asc' } });
  if (error) {
    console.error('Error listing files:', error);
    return;
  }

  for (const file of files) {
    if (file.name.endsWith('.pdf') || file.name.endsWith('.txt')) {
      // Download the file
      const { data: fileData, error: downloadError } = await supabase.storage.from(BUCKET).download(file.name);
      if (downloadError) {
        console.error(`Error downloading ${file.name}:`, downloadError);
        continue;
      }

      let text = '';
      if (file.name.endsWith('.pdf')) {
        const buffer = Buffer.from(await fileData.arrayBuffer());
        const pdfData = await pdfParse(buffer);
        text = pdfData.text;
      } else if (file.name.endsWith('.txt')) {
        text = await fileData.text();
      }

      // Insert into documents table
      const { error: insertError } = await supabase
        .from('documents')
        .insert([
          {
            user_id: file.name.split('/')[0], // assumes user_id is the first folder in the path
            file_url: `${BUCKET}/${file.name}`,
            file_type: path.extname(file.name).slice(1),
            uploaded_at: new Date().toISOString(),
            extracted_text: text,
          },
        ]);
      if (insertError) {
        console.error(`Error inserting document for ${file.name}:`, insertError);
      } else {
        console.log(`Processed and inserted: ${file.name}`);
      }
    }
  }
}

processFiles().then(() => {
  console.log('Done processing files.');
  process.exit(0);
});
