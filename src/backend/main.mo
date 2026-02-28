import Map "mo:core/Map";
import Runtime "mo:core/Runtime";
import Principal "mo:core/Principal";
import Time "mo:core/Time";
import Int "mo:core/Int";
import Nat "mo:core/Nat";
import Text "mo:core/Text";
import Char "mo:core/Char";
import Order "mo:core/Order";
import Array "mo:core/Array";
import Iter "mo:core/Iter";
import AccessControl "authorization/access-control";
import MixinAuthorization "authorization/MixinAuthorization";

actor {
  type UserProfile = {
    name : Text;
    mobile : Text;
    passwordHash : Text;
    sessionId : Text;
  };

  type Passage = {
    id : Text;
    title : Text;
    content : Text;
    timeMinutes : Nat;
  };

  type TestResult = {
    id : Text;
    userName : Text;
    userMobile : Text;
    passageTitle : Text;
    wpm : Nat;
    accuracy : Nat;
    mistakes : Nat;
    timestamp : Time.Time;
  };

  module Passage {
    public func compare(p1 : Passage, p2 : Passage) : Order.Order {
      Text.compare(p1.id, p2.id);
    };
  };

  module TestResult {
    public func compareByTime(r1 : TestResult, r2 : TestResult) : Order.Order {
      Int.compare(r1.timestamp, r2.timestamp);
    };
  };

  let userProfiles = Map.empty<Principal, UserProfile>();
  let mobileToUser = Map.empty<Text, Principal>();
  let passages = Map.empty<Text, Passage>();
  let testResults = Map.empty<Text, TestResult>();

  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  func hashPassword(password : Text) : Text {
    let chars = password.toArray();
    let hashedChars = chars.map(
      func(c) {
        let code = c.toNat32();
        let newCode = (code + 3) % 126;
        Char.fromNat32(if (newCode < 33) { 33 } else { newCode });
      }
    );
    Text.fromIter(hashedChars.values());
  };

  // UserProfile management functions required by frontend
  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  // User management - accessible to all (including guests for registration/login)
  public shared ({ caller }) func registerUser(name : Text, mobile : Text, password : Text) : async Text {
    if (mobileToUser.containsKey(mobile)) {
      Runtime.trap("Mobile number already registered");
    };

    let userProfile = {
      name;
      mobile;
      passwordHash = hashPassword(password);
      sessionId = "";
    };

    userProfiles.add(caller, userProfile);
    mobileToUser.add(mobile, caller);

    // Assign user role
    AccessControl.assignRole(accessControlState, caller, caller, #user);

    "OK";
  };

  public shared ({ caller }) func login(mobile : Text, password : Text) : async {
    #ok : {
      name : Text;
      mobile : Text;
      sessionId : Text;
    };
    #err : Text;
  } {
    switch (mobileToUser.get(mobile)) {
      case (null) {
        Runtime.trap("User does not exist");
      };
      case (?userPrincipal) {
        switch (userProfiles.get(userPrincipal)) {
          case (null) {
            Runtime.trap("User profile not found");
          };
          case (?profile) {
            if (profile.passwordHash != hashPassword(password)) {
              Runtime.trap("Invalid password");
            };
            let sessionId = hashPassword(profile.mobile # Time.now().toText());
            let updatedProfile = {
              profile with sessionId;
            };
            userProfiles.add(userPrincipal, updatedProfile);
            #ok ({
              name = profile.name;
              mobile = profile.mobile;
              sessionId;
            });
          };
        };
      };
    };
  };

  public shared ({ caller }) func checkSessionValid(mobile : Text, sessionId : Text) : async Bool {
    switch (mobileToUser.get(mobile)) {
      case (null) { false };
      case (?userPrincipal) {
        switch (userProfiles.get(userPrincipal)) {
          case (null) { false };
          case (?profile) { profile.sessionId == sessionId };
        };
      };
    };
  };

  public shared ({ caller }) func logout(mobile : Text) : async () {
    switch (mobileToUser.get(mobile)) {
      case (null) { Runtime.trap("User does not exist") };
      case (?userPrincipal) {
        if (caller != userPrincipal and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: Can only logout yourself");
        };
        switch (userProfiles.get(userPrincipal)) {
          case (null) { Runtime.trap("User profile not found") };
          case (?profile) {
            let updatedProfile = { profile with sessionId = "" };
            userProfiles.add(userPrincipal, updatedProfile);
          };
        };
      };
    };
  };

  // Passage management - getPassages accessible to users, others admin-only
  public query ({ caller }) func getPassages() : async [Passage] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view passages");
    };
    passages.values().toArray().sort();
  };

  public shared ({ caller }) func addPassage(title : Text, content : Text, timeMinutes : Nat) : async Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can add passages");
    };
    let id = hashPassword(title # Time.now().toText());
    let passage = {
      id;
      title;
      content;
      timeMinutes;
    };
    passages.add(id, passage);
    id;
  };

  public shared ({ caller }) func updatePassage(id : Text, title : Text, content : Text, timeMinutes : Nat) : async { #ok; #err : Text } {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can update passages");
    };
    switch (passages.get(id)) {
      case (null) {
        Runtime.trap("Passage does not exist");
      };
      case (?existing) {
        let updatedPassage = {
          existing with title;
          content;
          timeMinutes;
        };
        passages.add(id, updatedPassage);
        #ok;
      };
    };
  };

  public shared ({ caller }) func deletePassage(id : Text) : async { #ok; #err : Text } {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can delete passages");
    };
    if (not passages.containsKey(id)) {
      Runtime.trap("Passage does not exist");
    };
    passages.remove(id);
    #ok;
  };

  // Test results - accessible to authenticated users
  public shared ({ caller }) func submitTestResult(
    userName : Text,
    userMobile : Text,
    passageTitle : Text,
    wpm : Nat,
    accuracy : Nat,
    mistakes : Nat,
  ) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can submit test results");
    };
    let id = hashPassword(userMobile # Time.now().toText());
    let testResult = {
      id;
      userName;
      userMobile;
      passageTitle;
      wpm;
      accuracy;
      mistakes;
      timestamp = Time.now();
    };
    testResults.add(id, testResult);
  };

  public query ({ caller }) func getTestResults() : async [TestResult] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view test results");
    };
    testResults.values().toArray().sort(TestResult.compareByTime);
  };

  // Initialization functions - admin only
  public shared ({ caller }) func seedData() : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can seed data");
    };

    let existingPassages = passages.size();

    if (existingPassages > 0) {
      return;
    };

    let passagesToAdd : [(Text, Text, Nat)] = [
      (
        "The Beauty of Nature",
        "Nature is a magnificent tapestry of life that surrounds us every day. From the gentle sway of trees in the wind to the vibrant colors of flowers in bloom, nature offers endless beauty and inspiration. The sounds of birds chirping, the smell of fresh rain, and the sight of a clear blue sky all contribute to the peacefulness that nature provides. Spending time outdoors can help reduce stress, improve mood, and foster a sense of connection to the world around us. Whether hiking through mountains, walking along a beach, or simply sitting in a park, immersing oneself in nature is a reminder of the wonders that exist beyond our daily routines.",
        10,
      ),
      (
        "Advancements in Technology",
        "Technology has rapidly transformed the way we live, work, and communicate. From smartphones and computers to smart homes and artificial intelligence, innovations continue to shape our daily experiences. The internet has made information accessible to nearly everyone, enabling learning and collaboration across the globe. While technology brings many benefits, it also presents challenges such as privacy concerns and digital addiction. Balancing the use of technology with real-world interactions is essential for maintaining a healthy lifestyle. As new inventions emerge, it is important to adapt and use technology responsibly to improve our lives and society.",
        10,
      ),
      (
        "A Journey Through History",
        "History is a record of human experiences, achievements, and lessons learned over centuries. It teaches us about cultures, conflicts, and the evolution of societies. Studying history helps us understand the origins of traditions, beliefs, and systems that shape the present. From ancient civilizations to modern times, history is filled with stories of triumph and tragedy. By learning from the past, we can make informed decisions and avoid repeating mistakes. History also highlights the resilience and creativity of people throughout the ages. Embracing history allows us to appreciate the progress made and encourages continued growth for future generations.",
        10,
      ),
    ];

    let pIt = passagesToAdd.values();
    pIt.forEach(
      func((title, content, time)) {
        let id = hashPassword(title # Time.now().toText());
        let passage = {
          id;
          title;
          content;
          timeMinutes = time;
        };
        passages.add(id, passage);
      }
    );
  };

  public shared ({ caller }) func addAdmin() : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can add other admins");
    };

    let adminMobile = "8055926965";

    // Check if admin already exists
    if (mobileToUser.containsKey(adminMobile)) {
      return;
    };

    let adminProfile = {
      name = "admin";
      mobile = adminMobile;
      passwordHash = hashPassword("admin123");
      sessionId = "";
    };

    userProfiles.add(caller, adminProfile);
    mobileToUser.add(adminMobile, caller);

    // Assign admin role
    AccessControl.assignRole(accessControlState, caller, caller, #admin);
  };
};
