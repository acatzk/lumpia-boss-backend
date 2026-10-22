import { env } from 'cloudflare:test'

const getCredentials = () => {
  const projectId = env.NEON_PROJECT_ID
  const bearerToken = env.NEON_API_TOKEN
  if (!projectId || !bearerToken) return null
  return {
    projectId,
    bearerToken,
    baseUrl: `https://console.neon.tech/api/v2/projects/${projectId}`
  }
}

/**
 * Branch the target database, copying the schema and all current data.
 * @see https://neon.tech/docs/manage/branches#create-a-branch-with-the-api
 * @see https://api-docs.neon.tech/reference/createprojectbranch
 */
const createBranch = async (branchName: string) => {
  const creds = getCredentials()
  if (!creds) return null

  const response = await fetch(`${creds.baseUrl}/branches`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${creds.bearerToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      branch: {
        name: branchName
      },
      endpoints: [
        {
          type: 'read_write'
        }
      ]
    })
  })

  if (!response.ok) {
    throw new Error(`Failed to create test branch ${branchName}`, {
      cause: await response.json()
    })
  }

  const { branch } = await response.json<{
    branch: { id: string }
  }>()

  return branch
}

/**
 * Get branch connection URI by branch ID.
 * @see https://api-docs.neon.tech/reference/getconnectionuri
 */
const getConnectionUri = async (branchId: string) => {
  const creds = getCredentials()
  if (!creds) return ''

  const response = await fetch(
    `${creds.baseUrl}/connection_uri?branch_id=${branchId}&database_name=neondb&role_name=neondb_owner`,
    {
      headers: {
        Authorization: `Bearer ${creds.bearerToken}`,
        'Content-Type': 'application/json'
      }
    }
  )

  if (!response.ok) {
    throw new Error('Failed to get connection URI', {
      cause: await response.json()
    })
  }

  const { uri } = await response.json<{ uri: string }>()
  return uri
}

/**
 * Create a test branch based on the database associated with `NEON_PROJECT_ID` in `.dev.vars`.
 * @returns New branch connection URI, and branch ID for post-test cleanup.
 */
export const createTestBranch = async () => {
  const creds = getCredentials()
  if (!creds) {
    return { id: '', uri: env.DATABASE_URL || '' }
  }

  const branch = await createBranch(`test-${crypto.randomUUID()}`)
  if (!branch) {
    return { id: '', uri: env.DATABASE_URL || '' }
  }

  const uri = await getConnectionUri(branch.id)
  return { id: branch.id, uri }
}

/**
 * Delete branch by ID.
 * @see https://api-docs.neon.tech/reference/deleteprojectbranch
 */
export const deleteBranch = async (branchId: string) => {
  if (!branchId) return
  const creds = getCredentials()
  if (!creds) return

  const response = await fetch(`${creds.baseUrl}/branches/${branchId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${creds.bearerToken}`
    }
  })

  if (!response.ok) {
    throw new Error(`Failed to delete branch ${branchId}`, {
      cause: response
    })
  }
}
