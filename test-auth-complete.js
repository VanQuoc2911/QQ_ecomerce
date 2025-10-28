// Test both login and registration functionality
const testAuth = async () => {
  console.log("🧪 Testing Authentication System");
  console.log("=====================================");

  // Test users for registration
  const testUsers = [
    {
      name: "Test User Login",
      email: "testlogin@qqecommerce.com",
      password: "test123",
      role: "user",
    },
    {
      name: "Test Seller Login",
      email: "testsellerlogin@qqecommerce.com",
      password: "test123",
      role: "seller",
    },
    {
      name: "Test Shipper Login",
      email: "testshipperlogin@qqecommerce.com",
      password: "test123",
      role: "shipper",
    },
  ];

  // Test existing users for login
  const existingUsers = [
    {
      email: "admin@qqecommerce.com",
      password: "admin123",
    },
    {
      email: "seller@qqecommerce.com",
      password: "seller123",
    },
    {
      email: "user@qqecommerce.com",
      password: "user123",
    },
  ];

  console.log("\n📝 Testing Registration...");
  console.log("---------------------------");

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
        console.log(`✅ Registration successful for ${user.email}:`, {
          id: result.user.id,
          name: result.user.name,
          role: result.user.role,
          token: result.token ? "Generated" : "Missing",
        });
      } else {
        console.log(
          `❌ Registration failed for ${user.email}:`,
          result.message
        );
      }
    } catch (error) {
      console.log(`❌ Error registering ${user.email}:`, error.message);
    }
  }

  console.log("\n🔐 Testing Login...");
  console.log("-------------------");

  for (const user of existingUsers) {
    try {
      const response = await fetch("http://localhost:4000/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(user),
      });

      const result = await response.json();

      if (response.ok) {
        console.log(`✅ Login successful for ${user.email}:`, {
          id: result.user.id,
          name: result.user.name,
          role: result.user.role,
          token: result.token ? "Generated" : "Missing",
        });
      } else {
        console.log(`❌ Login failed for ${user.email}:`, result.message);
      }
    } catch (error) {
      console.log(`❌ Error logging in ${user.email}:`, error.message);
    }
  }

  console.log("\n🎯 Testing Login with New Users...");
  console.log("-----------------------------------");

  // Test login with newly registered users
  for (const user of testUsers) {
    try {
      const response = await fetch("http://localhost:4000/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: user.email,
          password: user.password,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        console.log(`✅ Login successful for newly registered ${user.email}:`, {
          id: result.user.id,
          name: result.user.name,
          role: result.user.role,
          token: result.token ? "Generated" : "Missing",
        });
      } else {
        console.log(
          `❌ Login failed for newly registered ${user.email}:`,
          result.message
        );
      }
    } catch (error) {
      console.log(
        `❌ Error logging in newly registered ${user.email}:`,
        error.message
      );
    }
  }

  console.log("\n✨ Authentication test completed!");
};

// Run test if this script is executed directly
if (typeof window === "undefined") {
  testAuth();
}
