import { useRouter } from 'next/router'
import { useEffect, useMemo, useState } from 'react'
import { client } from '../../lib/sanity.client'
import { PortableText } from '@portabletext/react'
import { urlFor } from '../../lib/imageUrl'
import Head from 'next/head'
import Link from 'next/link'

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

const createComponents = (addToGallery: (url: string) => void) => ({
  types: {
    image: ({ value }: any) => {
      const imageUrl = urlFor(value).url();
      addToGallery(imageUrl);
      return null;
    }
  }
});

export default function PostPage() {
  const router = useRouter()
  const { slug } = router.query

  const [post, setPost] = useState<Post | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [categories, setCategories] = useState<Record<string, number>>({})
  const selectedCategory = router.query.category as string | undefined
  const [galleryImages, setGalleryImages] = useState<string[]>([])
  const [allPosts, setAllPosts] = useState<Post[]>([])
  const currentIndex = allPosts.findIndex((p) => p.slug.current === slug)
  const prevPost = currentIndex > 0 ? allPosts[currentIndex - 1] : null
  const nextPost = currentIndex < allPosts.length - 1 ? allPosts[currentIndex + 1] : null

  useEffect(() => {
  const fetchAllPosts = async () => {
    const data = await client.fetch(`
      *[_type == "post"] | order(publishedAt asc){
        _id, title, slug, publishedAt
      }
    `)
    setAllPosts(data)
  }

  fetchAllPosts()
}, [])

  useEffect(() => {
    if (!slug) return

    const fetchPost = async () => {
      const query = `*[_type == "post" && slug.current == $slug][0]{
        _id,
        title,
        slug,
        publishedAt,
        body,
        mainImage{asset->{url}},
        categories[]->{title},
        author->{name}
      }`
      const data = await client.fetch(query, { slug })
      setPost(data)
    }

    const fetchSidebarPosts = async () => {
      const postsQuery = `*[_type == "post"] | order(publishedAt desc){
        _id,
        title,
        slug,
        mainImage{asset->{url}},
        categories[]->{title}
      }`
      const data = await client.fetch(postsQuery)
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

    fetchPost()
    fetchSidebarPosts()


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

  }, [slug])

  useEffect(() => {
    setGalleryImages([]);
  }, [post])

  const addToGallery = (url: string) => {
    setGalleryImages(prev => {
      if (prev.includes(url)) return prev;
      return [...prev, url];
    });
  };

  const components = useMemo(() => createComponents(addToGallery), [post])

  useEffect(() => {
    if (!post) return;

    const modal = document.getElementById('imageModal');
    const modalImage = document.getElementById('modalImage') as HTMLImageElement;
    const closeBtn = document.querySelector('#imageModal .close');

    if (!modal || !modalImage || !closeBtn) return;

    let currentImageIndex = 0;

    (window as any).openModal = (index: number) => {
      currentImageIndex = index;
      modalImage.src = galleryImages[currentImageIndex];
      modal.classList.add('active');
    };

    const closeModal = () => {
      modal.classList.remove('active');
    };

    closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    (window as any).changeImage = (direction: number) => {
      currentImageIndex += direction;
      if (currentImageIndex < 0) currentImageIndex = galleryImages.length - 1;
      if (currentImageIndex >= galleryImages.length) currentImageIndex = 0;
      modalImage.src = galleryImages[currentImageIndex];
    };

    return () => {
      closeBtn.removeEventListener('click', closeModal);
      modal.removeEventListener('click', closeModal);
    };
  }, [post, galleryImages]);
  

  if (!post) return <p>Ładowanie…</p>

  return (
    <>
      <Head>
        <title>{post.title}</title>
      </Head>

      <header className="home">
        <a href="https://artgrande.art"><img src="/loga/logo.png" alt="Logo" /></a>
        <nav>
          <ul>
            <li><a href="https://artgrande.art"><img src="/ikony/home.png" style={{ width: '20px', height: '15px' }} /></a></li>
            <li><a href="https://artgrande.art/spektakle">Spektakle dla szkół</a></li>
            <li><a href="https://artgrande.art/kino">Kino plenerowe</a></li>
            <li><a href="" className="active">Blog</a></li>
            <li><a href="https://artgrande.art/kontakt">Kontakt</a></li>
          </ul>
        </nav>
      </header>

      <section id="about" className="about">
        <main className="post-page">
          <article className="single-post">
            {post.mainImage?.asset?.url && (
              <img src={post.mainImage.asset.url} alt={post.title} className="post-main-image" />
            )}
            <h1 className="post-title-bar">{post.title}</h1>

            <p className="post-meta">
              <span className="post-date">📅 {new Date(post.publishedAt).toLocaleDateString()}</span>
              {post.categories?.length > 0 && (
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
                <span className="post-author"> | ✍️ {post.author.name}</span>
              )}
            </p>

            <div className="post-body">
              <div className="text-content">
                <PortableText value={post.body} components={components} />
              </div>

              {galleryImages.length > 0 && (
                <div className="gallery-wrapper">
                  <h3>Galeria zdjęć</h3>
                  <div className="gallery-container">
                    {galleryImages.map((src, index) => (
                      <div className="gallery-item" key={index} onClick={() => (window as any).openModal(index)}>
                        <img src={src} alt={`Galeria ${index + 1}`} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="post-actions">
              {prevPost && (
                <Link href={`/post/${prevPost.slug.current}`}>
                  <button className="prev-btn">← Poprzedni wpis</button>
                </Link>
              )}
              {nextPost && (
                <Link href={`/post/${nextPost.slug.current}`}>
                  <button className="prev-btn">Następny wpis →</button>
                </Link>
              )}
            </div>
          </article>

          <aside className="sidebar">

<section className="widget">
  <h3>Kategorie</h3>
  <ul className="category-list">
    <li>
      <Link href="/" className={!selectedCategory ? 'active' : ''}>
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
                {posts.slice(0, 5).map(p => (
                  <li key={p._id}>
                    {p.slug?.current && (
                      <Link href={`/post/${p.slug.current}`}>{p.title}</Link>
                    )}
                    {p.mainImage?.asset?.url && (
                      <img src={p.mainImage.asset.url} alt={p.title} />
                    )}
                  </li>
                ))}
              </ul>
            </section>
          </aside>
        </main>
      </section>

      <div className="modal" id="imageModal">
        <span className="close">&times;</span>
        <div className="arrow prev" onClick={() => (window as any).changeImage(-1)}>&#10094;</div>
        <img id="modalImage" src="" alt="Powiększone zdjęcie" />
        <div className="arrow next" onClick={() => (window as any).changeImage(1)}>&#10095;</div>
      </div>

      <footer>
        <p>&copy; 2025 Impresariat ArtGrande | <a href="https://www.facebook.com/impresariat.artgrande">Facebook</a></p>
        <p>Adres: Wrocław | Tel: 572-140-125</p>
      </footer>
    </>
  )
}