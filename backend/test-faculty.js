const axios = require('axios');

const testFacultyCreation = async () => {
  try {
    console.log('1. Attempting to login as admin...');
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'admin@gmail.com',
      password: 'admin123'
    });

    if (!loginResponse.data.token) {
      throw new Error('No token received from login');
    }

    console.log('2. Successfully logged in, got token');
    const token = loginResponse.data.token;

    const facultyData = {
      name: "Test Faculty",
      email: "testfaculty@test.com",
      password: "test123",
      role: "faculty",
      department: "Computer Science and Engineering",
      year: "1",
      semester: "1",
      section: "A",
      departments: ["Computer Science and Engineering"],
      years: ["1"],
      semesters: ["1", "2"],
      sections: ["A", "B"],
      isEventQuizAccount: false,
      assignments: [
        {
          department: "Computer Science and Engineering",
          year: "1",
          semester: "1",
          sections: ["A", "B"]
        },
        {
          department: "Computer Science and Engineering",
          year: "1",
          semester: "2",
          sections: ["A", "B"]
        }
      ]
    };

    console.log('3. Sending faculty data:', JSON.stringify(facultyData, null, 2));

    const response = await axios.post('http://localhost:5000/api/admin/accounts', facultyData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('4. Success! Faculty account created:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('Error occurred:');
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('Server responded with error:', {
        status: error.response.status,
        data: error.response.data,
        headers: error.response.headers
      });
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received:', error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Error setting up request:', error.message);
    }
  }
};

testFacultyCreation(); 