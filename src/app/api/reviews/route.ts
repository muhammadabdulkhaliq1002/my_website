import { NextResponse } from 'next/server';
import { validateGoogleConfig, googleConfig } from '@/lib/googleConfig';

// Cache the reviews for 1 hour to avoid hitting API limits
let cachedReviews: any = null;
let lastFetchTime: number = 0;
const CACHE_DURATION = 3600000; // 1 hour in milliseconds

export async function GET() {
  try {
    validateGoogleConfig();

    // Return cached reviews if available and not expired
    const now = Date.now();
    if (cachedReviews && (now - lastFetchTime) < CACHE_DURATION) {
      return NextResponse.json(cachedReviews);
    }

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?` +
      `place_id=${googleConfig.placeId}&` +
      `fields=reviews,rating,user_ratings_total&` +
      `key=${googleConfig.apiKey}&` +
      `language=en-GB`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch reviews from Google');
    }

    const data = await response.json();
    
    if (data.status !== 'OK') {
      throw new Error(`Invalid response from Google Places API: ${data.status}`);
    }

    // Sort reviews by date (newest first) and format the response
    const formattedReviews = {
      rating: data.result.rating || 0,
      total_ratings: data.result.user_ratings_total || 0,
      reviews: (data.result.reviews || [])
        .sort((a: any, b: any) => b.time - a.time)
        .map((review: any) => ({
          author_name: review.author_name,
          rating: review.rating,
          text: review.text,
          time: review.time,
          profile_photo_url: review.profile_photo_url,
          relative_time_description: review.relative_time_description
        }))
    };

    // Update cache
    cachedReviews = formattedReviews;
    lastFetchTime = now;

    return NextResponse.json(formattedReviews);
  } catch (error) {
    console.error('Error fetching reviews:', error);
    
    // If we have cached reviews and there's an error, return the cached version
    if (cachedReviews) {
      console.log('Returning cached reviews due to error');
      return NextResponse.json(cachedReviews);
    }

    return NextResponse.json(
      { error: 'Failed to fetch reviews' },
      { status: 500 }
    );
  }
}