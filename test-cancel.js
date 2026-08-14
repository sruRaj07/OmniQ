const axios = require('axios');
const jwt = require('jsonwebtoken');

const token = jwt.sign({ sub: 'd00d0000-0000-0000-0000-000000000000' }, 'test-secret');

async function test() {
  try {
    const res = await axios.post('http://localhost:4002/orders/test-id/cancel', {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log("SUCCESS", res.data);
  } catch (err) {
    console.log("ERROR", err.response?.data || err.message);
  }
}
test();
