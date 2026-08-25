export interface MockAadhaarUser {
  id: string;
  name: string;
  token: string;
}

export const MOCK_AUTH_TOKEN = "aadhaar_mock_token_12345";

export function authenticateWithAadhaar(personaId: string): Promise<MockAadhaarUser> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        id: personaId,
        name: "Mock User",
        token: MOCK_AUTH_TOKEN,
      });
    }, 1000); // simulate network delay
  });
}
