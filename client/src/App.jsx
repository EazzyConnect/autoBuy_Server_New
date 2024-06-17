import React, { useState } from "react";

const SignUp = ({ logInTab }) => {
  const [userDetails, setUserDetails] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirm_Password: "",
  });

  const [otp, setOTP] = useState("");
  const [verifyEmail, setVerifyEmail] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setUserDetails((prevDetails) => ({
      ...prevDetails,
      [name]: value,
    }));
  };

  const signUpUser = async (e) => {
    e.preventDefault();

    console.log("signing up...");
    try {
      const response = await fetch("/buyer/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstName: userDetails.firstName,
          lastName: userDetails.lastName,
          email: userDetails.email,
          password: userDetails.password,
          confirm_Password: userDetails.confirm_Password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Sign up failed");
      }

      console.log("Registration successful:", data);

      // Assuming successful registration, proceed to OTP verification
      setVerifyEmail(true); // Show OTP verification form
    } catch (error) {
      console.error("Registration error:", error.message);
      // Handle error, show error message or take appropriate action
    }
  };

  const userVerifyEmail = async (e) => {
    e.preventDefault();
    try {
      if (!otp) {
        throw Error("Please provide OTP");
      }

      // Send request to verify OTP
      const res = await fetch("/buyer/verification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ otp }),
      });

      // Throw error if req isn't successful
      if (!res.ok) {
        throw Error(res.error);
      }

      // Convert the JSON (response) to JSON string before sending to client
      const data = await res.json();

      if (!data.success) {
        throw Error(data.error);
      }

      console.log("Email verification successful:", data);

      // Handle successful email verification, e.g., redirect to dashboard or show success message
    } catch (error) {
      console.error("Email verification error:", error.message);
      // Handle error, show error message or take appropriate action
    }
  };

  return (
    <>
      <div>
        <h1>Sign-up Page</h1>
        <form onSubmit={signUpUser}>
          <input
            type="text"
            name="firstName"
            placeholder="Enter First Name"
            value={userDetails.firstName}
            onChange={handleChange}
            required
          />
          <input
            type="text"
            name="lastName"
            placeholder="Enter Last Name"
            value={userDetails.lastName}
            onChange={handleChange}
            required
          />
          <input
            type="email"
            name="email"
            placeholder="Enter Email"
            value={userDetails.email}
            onChange={handleChange}
            required
          />
          <input
            type="password"
            name="password"
            placeholder="Enter Password"
            value={userDetails.password}
            onChange={handleChange}
            required
          />
          <input
            type="password"
            name="confirm_Password"
            placeholder="Confirm Password"
            value={userDetails.confirm_Password}
            onChange={handleChange}
            required
          />
          <button type="submit">SIGN UP</button>
        </form>

        <div>
          <h5>Already have an account?</h5>
          <button onClick={logInTab}>Sign in here</button>
        </div>
      </div>

      {/* OTP Verification Section */}
      {verifyEmail && (
        <div>
          <h2>Enter OTP</h2>
          <form onSubmit={userVerifyEmail}>
            <input
              type="text"
              value={otp}
              onChange={(e) => setOTP(e.target.value)}
              placeholder="Enter OTP"
              required
            />
            <button type="submit">Verify OTP</button>
          </form>
        </div>
      )}
    </>
  );
};

export default SignUp;
