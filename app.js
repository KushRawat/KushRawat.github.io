const form = document.querySelector('#searchForm')
form.addEventListener('submit', async (e) => {
    e.preventDefault()
    // console.dir(form)
    const searchTerm = form.elements.query.value
    const config = { params: { q: searchTerm, wow: 'really' } }
    // const config = {params: {q: searchTerm, wow:'really'}}
    const res = await axios.get(`http://api.tvmaze.com/search/shows`, config)
    // const res = await axios.get(`http://api.tvmaze.com/search/shows?q=${searchTerm}`)
    // console.log(res.data[0].show.image.medium)
    // makeImages(res.data)
    // console.log(res.data)
    makeImages(res.data)
    form.elements.query.value = ''
})

const makeImages = (shows) => {
    for (let result of shows) {
        if (result.show.image) {
            const img = document.createElement('IMG')
            img.src = result.show.image.medium
            document.body.append(img)
        }
    }
}