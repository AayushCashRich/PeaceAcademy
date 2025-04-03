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
        id: string
        status: string
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

    async createLead(name: string, email: string): Promise<string> {
        try {
            const accessToken = await this.getAccessToken()

            // Split name into first and last name
            const nameParts = name.split(' ')
            const lastName = ""
            const firstName = name

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

            logger.info({ leadId: response.data.data[0].id }, 'Successfully created Zoho lead')
            return response.data.data[0].id
        } catch (error) {
            logger.error({ error }, 'Error creating Zoho lead')
            throw new Error('Failed to create lead')
        }
    }
}

// Create singleton instance
export const zohoService = new ZohoService()