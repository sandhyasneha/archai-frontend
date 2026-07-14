import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/dashboard', '/admin', '/settings', '/project', '/brownfield', '/blueprint', '/knowledge-base'],
    },
    sitemap: 'https://arch.nexplan.io/sitemap.xml',
  }
}
