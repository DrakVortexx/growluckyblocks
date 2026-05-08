// Test frontend authentication integration
const http = require('http');

// Test the new authentication endpoints
async function testAuthIntegration() {
  console.log('🧪 Testing Frontend-Backend Authentication Integration...');
  
  // Test 1: Guest user authentication
  console.log('\n1. Testing Guest User Authentication...');
  const guestOptions = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/profile',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-player-id': 'guest_test_12345',
      'x-auth-token': 'guest-guest_test_12345'
    }
  };
  
  try {
    const guestResponse = await makeRequest(guestOptions, JSON.stringify({
      playerId: 'guest_test_12345',
      username: 'TestGuest'
    }));
    
    console.log('✅ Guest auth response:', guestResponse);
  } catch (error) {
    console.log('❌ Guest auth failed:', error.message);
  }
  
  // Test 2: CrazyGames user authentication
  console.log('\n2. Testing CrazyGames User Authentication...');
  const crazyGamesOptions = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/profile',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-player-id': 'crazy_user_67890',
      'x-auth-token': 'crazygames-crazy_user_67890',
      'x-crazygames-user': JSON.stringify({
        userId: 'crazy_user_67890',
        username: 'CrazyPlayer',
        email: 'player@crazygames.com',
        avatar: 'https://example.com/avatar.png'
      })
    }
  };
  
  try {
    const crazyResponse = await makeRequest(crazyGamesOptions, JSON.stringify({
      playerId: 'crazy_user_67890',
      username: 'CrazyPlayer'
    }));
    
    console.log('✅ CrazyGames auth response:', crazyResponse);
  } catch (error) {
    console.log('❌ CrazyGames auth failed:', error.message);
  }
  
  console.log('\n🎉 Authentication Integration Test Complete!');
}

function makeRequest(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed });
        } catch (err) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });
    
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

// Run the test
testAuthIntegration().catch(console.error);
