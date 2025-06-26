import { useEffect, useState } from 'react'
import Link from 'next/link'
import { client } from '../lib/sanity.client'
import { PortableText } from '@portabletext/react'
import { useRouter } from 'next/router'


interface Post {
  _id: string
  title: string
  slug: { current: string }
  publishedAt: string
  body: any
  mainImage?: { asset: { url: string } }
  categories?: { title: string }[]
  author?: { name: string }
}

export default function Home() {
  const [posts, setPosts] = useState<Post[]>([])
  const [categories, setCategories] = useState<Record<string, number>>({})
  const router = useRouter()
  const selectedCategory = router.query.category as string | undefined
  const filteredPosts = selectedCategory
  ? posts.filter(post => post.categories?.some(cat => cat.title === selectedCategory))
  : posts

  function extractPlainText(portableText: any): string {
  return portableText
    ?.map((block: any) => (block._type === 'block' ? block.children.map((child: any) => child.text).join('') : ''))
    .join('\n')
    .trim();
}

  useEffect(() => {
    const fetchData = async () => {
      const data = await client.fetch(
       `*[_type == "post"] | order(publishedAt desc){
        _id,
        title,
        slug,
        publishedAt,
        body,
        mainImage{asset->{url}},
        categories[]->{title},
        author->{name}
      }`
      )
      setPosts(data)
      const categoryCounts: Record<string, number> = {}

data.forEach((post: Post) => {
  post.categories?.forEach(cat => {
    if (cat?.title) {
      categoryCounts[cat.title] = (categoryCounts[cat.title] || 0) + 1
    }
  })
})

setCategories(categoryCounts)
    }

    fetchData()

    // --- MENU LOGIKA
    const toggleMenu = () => {
      const menu = document.querySelector('nav ul')
      const hamburger = document.querySelector('.hamburger') as HTMLElement
      const close = document.querySelector('.close') as HTMLElement
      if (!menu || !hamburger || !close) return

      menu.classList.toggle('active')
      hamburger.style.display = menu.classList.contains('active') ? 'none' : 'block'
      close.style.display = menu.classList.contains('active') ? 'block' : 'none'
    }

    const toggleBtn = document.querySelector('.menu-toggle')
    toggleBtn?.addEventListener('click', toggleMenu)

    const onScroll = () => {
      const header = document.querySelector('header')
      if (window.scrollY > 50) {
        header?.classList.add('scrolled')
      } else {
        header?.classList.remove('scrolled')
      }
    }

    window.addEventListener('scroll', onScroll)

    return () => {
      toggleBtn?.removeEventListener('click', toggleMenu)
      window.removeEventListener('scroll', onScroll)
    }
  }, [])

  return (
    <>
      <header className="home">
        <a href="#"><img src="/loga/logo.png" alt="Logo" /></a>
        <nav>
          <ul>
            <li><a href="#" className="active"><img src="/ikony/home.png" style={{ width: '20px', height: '15px' }} /></a></li>
            <li><a href="/spektakle">Spektakle dla szkół</a></li>
            <li><a href="/kino">Kino plenerowe</a></li>
            <li><a href="/kontakt">Kontakt</a></li>
          </ul>
        </nav>
        <div className="menu-toggle">
          <span className="hamburger">&#9776;</span>
          <span className="close" style={{ display: 'none' }}>&times;</span>
        </div>
      </header>

      <section id="about" className="about">
      <main className="blog-layout">
        <div className="posts">
          {posts
           .filter(post => {
          if (!selectedCategory) return true
          return post.categories?.some(cat => cat.title === selectedCategory)
            })
          .map(post => (
            <article key={post._id} className="post-card">
              {post.mainImage?.asset?.url && (
                <img src={post.mainImage.asset.url} alt={post.title} />
              )}
              <h2>{post.title}</h2>
              <p className="post-meta">
                <span className="post-date">
                  📅 {new Date(post.publishedAt).toLocaleDateString()}
                </span>
                {post.categories && post.categories.length > 0 && (
                  <>
                    {' '}| 📁 {post.categories.map((cat, index) => (
                      <span key={index} className="post-category">
                        {cat.title}
                        {index < post.categories.length - 1 && ', '}
                      </span>
                    ))}
                  </>
                )}
                {post.author?.name && (
                  <span className="post-author">
                    {' '}| ✍️ {post.author.name}
                  </span>
                )}
              </p>
              <div className="blog-body">
                {extractPlainText(post.body).slice(0, 250)}...
              </div>
              {post.slug?.current && (
              <Link href={{ pathname: `/post/${post.slug.current}`, query: selectedCategory ? { category: selectedCategory } : {} }} className="read-more">Chcę przeczytać</Link>)}
            </article>
          ))}
        </div>

        <aside className="sidebar">
          <section className="widget">
  <h3>Kategorie</h3>
  <ul className="category-list">
  <li>
    <Link
      href="/"
      className={!selectedCategory ? 'active' : ''}
      title="Wszystkie posty"
    >
      Wszystkie<span className="count">({posts.length})</span>
    </Link>
  </li>
  {Object.entries(categories).map(([name, count]) => (
    <li key={name}>
      <Link
        href={{ pathname: '/', query: { category: name } }}
        className={selectedCategory === name ? 'active' : ''}
        title={`Wszystkie posty w kategorii ${name}`}
      >
        {name}<span className="count">({count})</span>
      </Link>
    </li>
  ))}
</ul>
</section>
          <section className="widget">
            <h3>Najnowsze wpisy</h3>
            <ul className="recent-posts">
              {posts.slice(0, 5).map(post => (
                <li key={post._id}>
                  {post.slug?.current && (
                  <Link href={`/post/${post.slug.current}`}>{post.title}</Link>)}
                  {post.mainImage?.asset?.url && (
                    <img src={post.mainImage.asset.url} alt={post.title} />
                  )}
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </main>
      </section>

      <footer>
        <p>&copy; 2025 Impresariat ArtGrande | <a href="https://www.facebook.com/impresariat.artgrande">Facebook</a></p>
        <p>Adres: Wrocław | Tel: 572-140-125</p>
      </footer>
    </>
  )
}
