import axios from 'axios'
import logger from '@/server/config/pino-config'
import { z } from 'zod'

// Schema for Zoho auth response
interface ZohoAuthResponse {
    access_token: string
    expires_in: number
}

// Schema for Zoho lead response
interface ZohoLeadResponse {
    data: Array<{
        id?: string
        status: string
        code?: string
        details?: {
            api_name: string
            id: string
        }
        message?: string
    }>
}

export class ZohoService {
    private refreshToken: string
    private clientId: string
    private clientSecret: string
    private baseUrl: string
    private authUrl: string

    constructor() {
        this.refreshToken = process.env.ZOHO_REFRESH_TOKEN || ''
        this.clientId = process.env.ZOHO_CLIENT_ID || ''
        this.clientSecret = process.env.ZOHO_CLIENT_SECRET || ''
        this.baseUrl = 'https://www.zohoapis.in/crm/v2'
        this.authUrl = 'https://accounts.zoho.in/oauth/v2/token'
    }

    private async getAccessToken(): Promise<string> {
        try {
            const response = await axios.post<ZohoAuthResponse>(
                this.authUrl,
                new URLSearchParams({
                    refresh_token: this.refreshToken,
                    client_id: this.clientId,
                    client_secret: this.clientSecret,
                    grant_type: 'refresh_token'
                }),
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                }
            )

            logger.info('Successfully retrieved Zoho access token')
            return response.data.access_token
        } catch (error) {
            logger.error({ error }, 'Error getting Zoho access token')
            throw new Error('Failed to get access token')
        }
    }

    async createLead(name: string, email: string): Promise<{
        success: boolean
        isDuplicate?: boolean
        leadId?: string
        existingLeadId?: string
        error?: string
    }> {
        try {
            const accessToken = await this.getAccessToken()

            // Split name into first and last name
            const nameParts = name.split(' ')
            let lastName = nameParts.pop() || ''
            const firstName = nameParts.join(' ')

            // Validate if we have a last name
            if (!lastName) {
                return {
                    success: false,
                    error: 'MISSING_LAST_NAME'
                }
            }

            const response = await axios.post<ZohoLeadResponse>(
                `${this.baseUrl}/Leads`,
                {
                    data: [
                        {
                            Last_Name: lastName,
                            First_Name: firstName,
                            Email: email,
                            Lead_Source: 'Website Chat'
                        }
                    ]
                },
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            )

            const leadData = response.data.data[0]
            logger.info({ leadData }, 'Zoho API Response')

            // Handle different response scenarios
            if (leadData.code === 'DUPLICATE_DATA' && leadData.details?.api_name === 'Email') {
                logger.info({ email, existingLeadId: leadData.details.id }, 'Duplicate email found')
                return {
                    success: false,
                    isDuplicate: true,
                    existingLeadId: leadData.details.id
                }
            } else if (leadData.status === 'success' || leadData.id) {
                logger.info({ leadId: leadData.id }, 'Successfully created lead')
                return {
                    success: true,
                    leadId: leadData.id
                }
            } else {
                throw new Error(leadData.message || 'Unknown error occurred')
            }
        } catch (error) {
            logger.error({ error }, 'Error creating Zoho lead')
            throw error
        }
    }
}

// Create singleton instance
export const zohoService = new ZohoService()