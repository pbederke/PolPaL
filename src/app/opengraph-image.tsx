import { ImageResponse } from 'next/og';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export const alt = 'PolPaL — Political Party Links';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const PRIMARY = '#488ccc';
const DARK = '#1e3a5f';

export default async function OpengraphImage() {
  const logoBuffer = readFileSync(
    join(process.cwd(), 'public', 'images', 'logos', 'polpal_logo_provisional.png'),
  );
  const logoDataUrl = `data:image/png;base64,${logoBuffer.toString('base64')}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          background: 'linear-gradient(135deg, #ffffff 0%, #f2f8fd 100%)',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            width: 16,
            height: '100%',
            background: PRIMARY,
          }}
        />
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            padding: '0 80px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 24,
              marginBottom: 28,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse renders to an SVG canvas; next/image cannot be used here */}
            <img
              src={logoDataUrl}
              width={96}
              height={96}
              alt=""
              style={{ objectFit: 'contain' }}
            />
            <div
              style={{
                fontSize: 60,
                fontWeight: 800,
                letterSpacing: '-1px',
                color: DARK,
              }}
            >
              PolPaL
            </div>
          </div>
          <div
            style={{
              fontSize: 34,
              fontWeight: 700,
              color: PRIMARY,
              marginBottom: 16,
            }}
          >
            Political Party Links
          </div>
          <div
            style={{
              fontSize: 26,
              lineHeight: 1.4,
              color: '#4b5a6b',
              maxWidth: 640,
            }}
          >
            A linkage key database for political entities across social science
            datasets.
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
