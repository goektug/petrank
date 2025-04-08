import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

// Interface for cached image URLs
interface CachedUrl {
  url: string;
  expires: number;
}

// In-memory cache to prevent repeated API calls during a single session
const memoryCache: Record<string, { url: string, expires: number }> = {};

// Check if a cached URL is expired
const isUrlExpired = (cachedData: string): boolean => {
  try {
    const data = JSON.parse(cachedData) as CachedUrl;
    return Date.now() > data.expires;
  } catch (e) {
    return true; // If can't parse, consider it expired
  }
};

// Get a direct public URL (not signed) which is more compatible with Next.js Image
const getPublicImageUrl = (filePath: string, petId: string): string => {
  // Check in-memory cache first to prevent repeated calls during the same session
  const memoryCacheKey = `public_${petId}`;
  if (memoryCache[memoryCacheKey] && Date.now() < memoryCache[memoryCacheKey].expires) {
    return memoryCache[memoryCacheKey].url;
  }
  
  const supabase = createClientComponentClient();
  const { data } = supabase.storage.from('pet-images').getPublicUrl(filePath);
  
  if (data?.publicUrl) {
    // Store in memory cache for 1 hour
    memoryCache[memoryCacheKey] = {
      url: data.publicUrl,
      expires: Date.now() + (60 * 60 * 1000) // 1 hour
    };
    console.log(`Using public URL for pet ${petId}`);
  }
  
  return data?.publicUrl || '';
};

// Get URL from cache or fetch a new one
export const getCachedImageUrl = async (
  filePath: string,
  petId: string,
  expiryHours: number = 12
): Promise<string | null> => {
  if (typeof window === 'undefined') {
    return null; // Return null during SSR
  }
  
  // Check in-memory cache first (fastest)
  const memoryCacheKey = `mem_${petId}`;
  if (memoryCache[memoryCacheKey] && Date.now() < memoryCache[memoryCacheKey].expires) {
    return memoryCache[memoryCacheKey].url;
  }

  // First try to generate a direct public URL (not signed)
  // This is more compatible with Next.js Image component
  const publicUrl = getPublicImageUrl(filePath, petId);
  if (publicUrl) {
    // Cache the public URL in memory to reduce logging noise
    memoryCache[memoryCacheKey] = {
      url: publicUrl,
      expires: Date.now() + (expiryHours * 60 * 60 * 1000)
    };
    return publicUrl;
  }

  // If public URL fails, try to get from localStorage
  const cacheKey = `pet_image_${petId}`;
  const cachedData = localStorage.getItem(cacheKey);
  
  if (cachedData && !isUrlExpired(cachedData)) {
    try {
      const data = JSON.parse(cachedData) as CachedUrl;
      console.log(`Using cached image URL for pet ${petId}, expires in ${Math.round((data.expires - Date.now()) / 1000 / 60)} minutes`);
      
      // Update memory cache with localStorage value
      memoryCache[memoryCacheKey] = {
        url: data.url,
        expires: data.expires
      };
      
      return data.url;
    } catch (e) {
      console.error('Error parsing cached URL:', e);
    }
  }
  
  // If not in cache or expired, get fresh URL
  try {
    const supabase = createClientComponentClient();
    console.log(`Getting fresh signed URL for pet ${petId}`);
    
    const { data, error } = await supabase.storage
      .from('pet-images')
      .createSignedUrl(
        filePath, 
        24 * 60 * 60 // 24 hours validity (maximum allowed)
      );
      
    if (error || !data?.signedUrl) {
      console.error('Error getting signed URL:', error);
      return null;
    }
    
    // Store URL in both caches
    const expiryTime = Date.now() + expiryHours * 60 * 60 * 1000;
    
    localStorage.setItem(
      cacheKey,
      JSON.stringify({ url: data.signedUrl, expires: expiryTime })
    );
    
    memoryCache[memoryCacheKey] = {
      url: data.signedUrl,
      expires: expiryTime
    };
    
    return data.signedUrl;
  } catch (err) {
    console.error('Failed to get signed URL:', err);
    return null;
  }
};

// Prefetch and cache multiple image URLs
export const prefetchImageUrls = async (pets: any[]): Promise<void> => {
  if (typeof window === 'undefined') return;
  
  // Prefetch in parallel with a slight delay between batches
  const batchSize = 5;
  for (let i = 0; i < pets.length; i += batchSize) {
    const batch = pets.slice(i, i + batchSize);
    
    await Promise.all(
      batch.map(pet => {
        if (pet.file_path && pet.id) {
          return getCachedImageUrl(pet.file_path, pet.id);
        }
        return Promise.resolve();
      })
    );
    
    // Small delay between batches to prevent rate limiting
    if (i + batchSize < pets.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
}; 