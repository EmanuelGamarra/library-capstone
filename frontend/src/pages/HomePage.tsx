import { useEffect } from "react";
import { testOpenLibraryConnection } from "../api/openLibraryApi";
import { getHealth } from "../api/backendApi";

function HomePage() {
  // main connections tests
  useEffect(() => {
    const testConnections = async () => {
      try {
        const data = await testOpenLibraryConnection();

        console.log("Open library connection successful", data);

        const backendData = await getHealth();

        console.log("Backend connection successful", backendData);
      } catch (error) {
        console.error("Connection test failed:", error);
      }
    };

    testConnections();
  }, []);

  return (
    <>
      <h1>Explore Books</h1>
      <p>Discover your next book.</p>
    </>
  );
}

export default HomePage;
