export let registeredUsers = [
  { name: 'Admin User', email: 'admin@demo.com', password: 'admin123' },
  { name: 'Manager User', email: 'manager@demo.com', password: 'manager123' },
];

let currentUser = null;

export function authenticateUser(email, password) {
  const normalizedEmail = email.trim().toLowerCase();
  const user = registeredUsers.find(
    (registeredUser) => registeredUser.email.toLowerCase() === normalizedEmail && registeredUser.password === password,
  );

  if (user) {
    currentUser = user;
  }

  return user;
}

export function getCurrentUser() {
  return currentUser;
}

export function setCurrentUser(user) {
  currentUser = user;
}

export function updateCurrentUser(updates) {
  if (!currentUser) return null;

  const previousEmail = currentUser.email.toLowerCase();
  currentUser = { ...currentUser, ...updates };
  const wasRegistered = registeredUsers.some(
    (user) => user.email.toLowerCase() === previousEmail,
  );
  registeredUsers = wasRegistered
    ? registeredUsers.map((user) =>
        user.email.toLowerCase() === previousEmail ? { ...user, ...updates } : user,
      )
    : [...registeredUsers, currentUser];
  return currentUser;
}

export function clearCurrentUser() {
  currentUser = null;
}

export function addUser(user) {
  registeredUsers = [...registeredUsers, user];
}
