This is the app I would like to build ultimately

### Overall Explanation

The AI-Powered Pet Ranking Tool allows users to post images of their pets to have these images displayed on an Instagram like square grid of photos. Once it is uploaded, each photo is given an hash. When clicked upon an image, a window pops up to show the image in large resolution. Users can submit text, which must contain the name of the animal, and could contain the age and the sex. The user can also link to Twitter or Instagram pages. The app utilizes AI to match the count of how many times a pet's window has been opened up, with the pet's hash, to determine a leaderboard. The leader of the leaderboard is displayed at the top of the webpage, and the rest of the ranking follows.

## User Experience Outline

1. **No User Registration or Login
    - Users can directly upload images, pending admin approval
    - Users can share their personal addresses via links if they want
2. **Leaderboard
    - The ranking is based on solely how many windows have been opened of a pet
    - Pets climb up the page to the top as their popularity rises
3. **Creating New Images
    - Each user is free to upload as many pet images as they like, pets only!
    - Users are encouraged to share details about their pets
4. **Download Authorization
    - Users can select if they want the images to be downloaded at the upload section.
5. **Admin Tools
    - In the header next to the PetRank Title there is a Github authentication to the admin panel
    - Admin panel shows which images are being uploaded, with accept or reject button under each image
    - Admin tools are built on Supabase
6. **Deployment
    - The webpage will be hosted at Vercel