const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.warn('⚠️ SUPABASE_URL or SUPABASE_KEY is missing in environment variables. Please check your .env file.');
}

const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseKey || 'placeholder', {
    auth: {
        persistSession: false,
        autoRefreshToken: false
    }
});

// Helper for Supabase Storage operations
const storage = {
    // Upload file buffer to Supabase bucket
    async uploadFile(bucket, path, fileBuffer, contentType = 'application/octet-stream') {
        const { data, error } = await supabase.storage
            .from(bucket)
            .upload(path, fileBuffer, {
                contentType,
                upsert: true
            });
        if (error) throw error;
        return data;
    },

    // Get public URL for an asset
    getPublicUrl(bucket, path) {
        const { data } = supabase.storage
            .from(bucket)
            .getPublicUrl(path);
        return data.publicUrl;
    },

    // List files in a bucket
    async listFiles(bucket, folder = '') {
        const { data, error } = await supabase.storage
            .from(bucket)
            .list(folder);
        if (error) throw error;
        return data;
    }
};

module.exports = {
    supabase,
    storage
};
