/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your SCORZ verification code</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Img
            src="https://dwcdxofvxsmpbziosvbo.supabase.co/storage/v1/object/public/email-assets/logo.png"
            width="40"
            height="40"
            alt="SCORZ"
            style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '12px' }}
          />
          <span style={wordmark}>SCOR</span>
          <span style={wordmarkAccent}>Z</span>
        </Section>
        <Heading style={h1}>Verification code</Heading>
        <Text style={text}>Use this code to confirm your identity:</Text>
        <Text style={codeStyle}>{token}</Text>
        <Text style={footer}>
          This code expires shortly. Didn't request it? Ignore this email.
        </Text>
        <Text style={brand}>© 2026 SCORZ &nbsp;|&nbsp; Powered by phnyx.dev</Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }
const container = { padding: '32px 32px 24px' }
const header = { textAlign: 'center' as const, marginBottom: '24px' }
const wordmark = { fontSize: '24px', fontWeight: 800 as const, letterSpacing: '2px', color: '#1a1b25' }
const wordmarkAccent = { fontSize: '24px', fontWeight: 800 as const, letterSpacing: '2px', color: '#f59e0b' }
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: '#1a1b25',
  margin: '0 0 16px',
  fontFamily: "'JetBrains Mono', 'Courier New', monospace",
}
const text = {
  fontSize: '15px',
  color: '#6b6e76',
  lineHeight: '1.6',
  margin: '0 0 20px',
}
const codeStyle = {
  fontFamily: "'JetBrains Mono', 'Courier New', monospace",
  fontSize: '32px',
  fontWeight: 'bold' as const,
  color: '#1a1b25',
  letterSpacing: '6px',
  margin: '0 0 28px',
  textAlign: 'center' as const,
}
const footer = { fontSize: '12px', color: '#a1a1aa', margin: '28px 0 0' }
const brand = {
  fontSize: '11px',
  color: '#a1a1aa',
  fontFamily: "'JetBrains Mono', 'Courier New', monospace",
  letterSpacing: '1px',
  textAlign: 'center' as const,
  margin: '24px 0 0',
  borderTop: '1px solid #e4e4e7',
  paddingTop: '16px',
}
