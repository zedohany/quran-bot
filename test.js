const axios = require('axios');

async function getAccessToken() {
  const clientId = '64b6a207-96a8-4f8f-9a55-e28218046c8f';
  const clientSecret = 'gfiUJDT~.kw8hdXT7hRvc67RqQ';

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  try {
    const response = await axios({
      method: 'post',
      url: 'https://prelive-oauth2.quran.foundation/oauth2/token',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      data: 'grant_type=client_credentials&scope=content'
    });

    console.log(response);
    return response.data.access_token;
  } catch (error) {
    console.error('Error getting access token:', error);
  }
}

let config = {
  method: 'get',
maxBodyLength: Infinity,
  url: 'https://apis-prelive.quran.foundation/content/api/v4/resources/recitations',
  headers: { 
    'Accept': 'application/json', 
    'x-auth-token': 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjI5M2JiNjhkLWU0NGQtNDJhZi04MThjLTc5MjQ3MzUzYjZmMiIsInR5cCI6IkpXVCJ9.eyJhdWQiOltdLCJjbGllbnRfaWQiOiJkMjg2Njg5Yy0wYTJlLTRlYjEtOTMyOC05NzY2ZjJmN2M2MjMiLCJleHAiOjE3NTYwMzE5MTMsImV4dCI6e30sImlhdCI6MTc1NjAyODMxMywiaXNzIjoiaHR0cHM6Ly9wcmVsaXZlLW9hdXRoMi5xdXJhbi5mb3VuZGF0aW9uIiwianRpIjoiMzM4MjA2YmEtMWE4My00ZTI4LThjYzctNDhhYjYzZTVjMjc0IiwibmJmIjoxNzU2MDI4MzEzLCJzY3AiOlsiY29udGVudCJdLCJzdWIiOiJkMjg2Njg5Yy0wYTJlLTRlYjEtOTMyOC05NzY2ZjJmN2M2MjMifQ.SZj315bQlpmFPc0R00xPpQwPRmFUCd9x5jzM1J_tRYfseom6AqtCKSd05hShHb0cWlthZPI6oIoJZrGNkuItd99SX0o0vdfO9QMRMbkp3dyOLuwBzlTu_Nethbl7bV1AGTH6S2PPW93uygmOwQWiEP20z5nL6ae_VKZUDytX-whqTU93dpsbC77y-AfiNV8aOLz41WN7rjy5GPjoUt_EyRl9XkagpuvqtsBsUH2PfiDCUnlBVSjFZZH4MUmuAROM89Pml5Kmi43yw0QzUdnAvibjS4mCIoiqiMTpzxwcgFFCr9pFLjVaeKsq5XesOERZ5zVTHBsR4q93XfPB6dpLoE9rk5toxOsSL9X9Q8ARxTUkIY0jugodaxXYKHjfp96gcPtDOkRV1_OjoX_wZNKQC1Z0IYDKwJOJ2zlSmIBNFj4yajDYJukNsT_mZPR7BuoaYjVFykBAp2MqMZditTvbvptDPeRMyjfmHqOwEmL1a2t7lZQgjNGrwdar7ybNqXErZuR5ncJVOnriKH4VOcKGS7STjZYoAayFCF9kTlyN8PV0FWEm3W-oTM0mLc_Ht_3PlvGYP9QtboYgnQc4tRjTKcHtvSE6xVwXKh_zPrGV19iPYPU51L9Mx1Ms_iIPTKw2hbFKiQyBcVjckSmeZpBLQa6A5hFROZMXons28kZlMFk', 
    'x-client-id': 'd286689c-0a2e-4eb1-9328-9766f2f7c623'
  }
};

axios(config)
.then((response) => {
//   console.log(JSON.stringify(response.data));
})
.catch((error) => {
  console.log(error);
});

console.log(getAccessToken());