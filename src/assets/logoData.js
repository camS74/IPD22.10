// Base64 encoded Interplast logo data for embedding
export const INTERPLAST_LOGO_BASE64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMgAAADICAYAAACtWK6eAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAN1wAADdcBQiibeAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAABUYSURBVHic7Z1tjFXHfcafZ2Yud8HG2GuSxsY4sYnjOm3SpqHdqFVe3KRq80HpB79I+VRLL9V/aT+0H9qq/dBKrVSpjdpGbSo1aprGSf2tUROnDa2t1E6Txmmc2Mm';

// Alternative: For very small logos, we can use a minimal SVG version
export const INTERPLAST_LOGO_SVG = `data:image/svg+xml;base64,${btoa(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 50">
  <rect width="200" height="50" fill="#0066cc"/>
  <text x="100" y="30" font-family="Arial, sans-serif" font-size="20" font-weight="bold" text-anchor="middle" fill="white">
    INTERPLAST
  </text>
</svg>
`)}`; 