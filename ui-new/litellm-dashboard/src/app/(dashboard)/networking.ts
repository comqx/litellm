import { Organization, teamListCall } from "@/components/networking";

export const fetchTeams = async (
  accessToken: string,
  userID: string | null,
  userRole: string | null,
  currentOrg: Organization | null,
) => {
  let givenTeams;
  if (userRole != "Admin" && userRole != "Proxy 管理员查看者") {
    givenTeams = await teamListCall(accessToken, currentOrg?.organization_id || null, userID);
  } else {
    givenTeams = await teamListCall(accessToken, currentOrg?.organization_id || null);
  }

  return givenTeams;
};
