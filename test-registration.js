// Test registration functionality
const testRegistration = async () => {
  const testUsers = [
    {
      name: "Test User 1",
      email: "testuser1@qqecommerce.com",
      password: "test123",
      role: "user",
    },
    {
      name: "Test Seller 1",
      email: "testseller1@qqecommerce.com",
      password: "test123",
      role: "seller",
    },
    {
      name: "Test Shipper 1",
      email: "testshipper1@qqecommerce.com",
      password: "test123",
      role: "shipper",
    },
  ];

  for (const user of testUsers) {
    try {
      const response = await fetch("http://localhost:4000/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(user),
      });

      const result = await response.json();

      if (response.ok) {
        console.log(`✅ Registration successful for ${user.email}:`, result);
      } else {
        console.log(`❌ Registration failed for ${user.email}:`, result);
      }
    } catch (error) {
      console.log(`❌ Error registering ${user.email}:`, error);
    }
  }
};

// Run test if this script is executed directly
if (typeof window === "undefined") {
  testRegistration();
}
