// ... (previous imports and state remain the same)

useEffect(() => {
  console.log("Auth Listener Initialized ✅");
  const handleRedirectResult = async () => {
    try {
      const result = await getRedirectResult(auth);
      if (result && result.user) {
        console.log("✅ Redirect Sign-In Successful:", result.user.uid, result.user.email);
        setUser(result.user);
        const userRef = doc(db, "users", result.user.uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
          console.log("New user detected 🚀 - Creating Firestore profile...");
          const newUserData = { uid: result.user.uid, terrabucks: 1000 };
          await setDoc(userRef, newUserData);
          setUser((prev) => ({ ...prev, ...newUserData }));
        } else {
          const userData = userSnap.data();
          setUser((prev) => ({ ...prev, terrabucks: userData.terrabucks ?? 1000 }));
        }
        fetchOwnedTerracres();
        setMapKey(Date.now());
      } else {
        console.log("No redirect result or no user.");
      }
    } catch (error) {
      console.error("❌ Redirect Result Error:", error.code, error.message);
    }
  };
  handleRedirectResult();

  const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
    if (!isMounted) return;
    console.log("Auth State Changed ✅:", currentUser?.uid || "No user");

    if (currentUser && !user) {
      const userRef = doc(db, "users", currentUser.uid);
      try {
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
          console.log("New user detected 🚀 - Creating Firestore profile...");
          const newUserData = { uid: currentUser.uid, terrabucks: 1000 };
          await setDoc(userRef, newUserData);
          setUser({ ...currentUser, ...newUserData });
        } else {
          const userData = userSnap.data();
          setUser({ ...currentUser, terrabucks: userData.terrabucks ?? 1000 });
        }
        fetchOwnedTerracres();
        setMapKey(Date.now());
      } catch (err) {
        console.error("Firestore auth error:", err);
        setError("Failed to load user data.");
      }
    } else if (!currentUser) {
      setUser(null);
      setOwnedTerracres([]);
      setMapKey(Date.now());
    }
  });

  return () => {
    setIsMounted(false);
    unsubscribe();
  };
}, []);

// ... (rest of the code remains the same)
