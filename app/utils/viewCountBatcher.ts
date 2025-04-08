import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

// Record of pending view count updates: { petId: countToAdd }
type PendingViewCounts = Record<string, number>;

// Singleton to manage view count updates
class ViewCountBatcher {
  private static instance: ViewCountBatcher;
  private pendingViewCounts: PendingViewCounts = {};
  private flushInterval: NodeJS.Timeout | null = null;
  private flushInProgress: boolean = false;
  private listeners: Set<(petId: string, newCount: number) => void> = new Set();

  private constructor() {
    // Private constructor for singleton
  }

  public static getInstance(): ViewCountBatcher {
    if (!ViewCountBatcher.instance) {
      ViewCountBatcher.instance = new ViewCountBatcher();
    }
    return ViewCountBatcher.instance;
  }

  // Start the automatic flushing interval
  public startBatching(intervalMs: number = 5 * 60 * 1000): void {
    // Clear any existing interval
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }

    // Set up new interval
    this.flushInterval = setInterval(() => {
      this.flushUpdates();
    }, intervalMs);

    console.log(`View count batcher started with interval of ${intervalMs/1000} seconds`);
  }

  // Stop the automatic flushing
  public stopBatching(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
  }

  // Add a view count to be batched
  public incrementViewCount(petId: string): void {
    this.pendingViewCounts[petId] = (this.pendingViewCounts[petId] || 0) + 1;
    console.log(`Added view count for pet ${petId}, pending=${this.pendingViewCounts[petId]}`);
    
    // Get the optimistic count and notify listeners when available
    this.getOptimisticCount(petId).then(count => {
      this.notifyListeners(petId, count);
    }).catch(error => {
      console.error("Error getting optimistic count:", error);
    });
  }

  // Register a callback for updates
  public addListener(callback: (petId: string, newCount: number) => void): () => void {
    this.listeners.add(callback);
    
    // Return a function to remove the listener
    return () => {
      this.listeners.delete(callback);
    };
  }

  // Manually trigger a flush of pending updates to the database
  public async flushUpdates(): Promise<void> {
    if (this.flushInProgress || Object.keys(this.pendingViewCounts).length === 0) {
      return;
    }

    this.flushInProgress = true;
    const supabase = createClientComponentClient();

    try {
      // Copy and reset pending counts
      const updates = { ...this.pendingViewCounts };
      this.pendingViewCounts = {};

      console.log(`Flushing ${Object.keys(updates).length} batched view count updates`);

      // Process in batches to avoid rate limiting
      const batchSize = 10;
      const petIds = Object.keys(updates);

      for (let i = 0; i < petIds.length; i += batchSize) {
        const batch = petIds.slice(i, i + batchSize);
        await Promise.all(
          batch.map(async (petId) => {
            const incrementBy = updates[petId];
            
            // First get the current view count
            const { data: currentData, error: fetchError } = await supabase
              .from('pet_uploads')
              .select('view_count')
              .eq('id', petId)
              .single();
            
            if (fetchError) {
              console.error(`Error fetching current view count for pet ${petId}:`, fetchError);
              // Put the count back in pending
              this.pendingViewCounts[petId] = (this.pendingViewCounts[petId] || 0) + incrementBy;
              return;
            }
            
            // Calculate new view count
            const currentCount = currentData?.view_count || 0;
            const newCount = currentCount + incrementBy;
            
            // Update the view count
            const { error: updateError } = await supabase
              .from('pet_uploads')
              .update({ view_count: newCount })
              .eq('id', petId);
            
            if (updateError) {
              console.error(`Error updating view count for pet ${petId}:`, updateError);
              // Put the count back in pending
              this.pendingViewCounts[petId] = (this.pendingViewCounts[petId] || 0) + incrementBy;
            } else {
              console.log(`Successfully updated view count for pet ${petId}: ${currentCount} → ${newCount}`);
              this.notifyListeners(petId, newCount);
            }
          })
        );
        
        // Small delay between batches
        if (i + batchSize < petIds.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    } catch (err) {
      console.error('Error during view count batch update:', err);
    } finally {
      this.flushInProgress = false;
    }
  }

  // Get the optimistic count (current DB count + pending increments)
  public async getOptimisticCount(petId: string): Promise<number> {
    try {
      const supabase = createClientComponentClient();
      const pendingIncrement = this.pendingViewCounts[petId] || 0;
      
      // Get current count from DB
      const { data, error } = await supabase
        .from('pet_uploads')
        .select('view_count')
        .eq('id', petId)
        .single();
      
      if (error) {
        console.error(`Error getting current view count for ${petId}:`, error);
        return pendingIncrement;
      }
      
      const currentCount = data?.view_count || 0;
      return currentCount + pendingIncrement;
    } catch (err) {
      console.error('Error getting optimistic count:', err);
      return this.pendingViewCounts[petId] || 0;
    }
  }

  private notifyListeners(petId: string, newCount: number): void {
    this.listeners.forEach(callback => {
      try {
        callback(petId, newCount);
      } catch (err) {
        console.error('Error in view count listener:', err);
      }
    });
  }
}

export default ViewCountBatcher.getInstance(); 