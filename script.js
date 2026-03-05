
let sound = null;
let tracks = []; 
let currentIndex = 0;
let isPlaying = false;
let playlists = JSON.parse(localStorage.getItem('playlists')) || {}; 
let artistPfps = JSON.parse(localStorage.getItem('artistPfps')) || {}; 

const els = {
  uploadTracks: document.getElementById('upload-tracks'),
  uploadFolder: document.getElementById('upload-folder'),
  trackList: document.getElementById('track-list'),
  libraryGroups: document.getElementById('library-groups'),
  trackTitle: document.getElementById('track-title'),
  albumInfo: document.getElementById('album-info'),
  artistPfp: document.getElementById('artist-pfp'),
  playPause: document.getElementById('play-pause'),
  prev: document.getElementById('prev'),
  next: document.getElementById('next'),
  volume: document.getElementById('volume'),
  progress: document.getElementById('progress'),
  themeToggle: document.getElementById('theme-toggle'),
  gradStart: document.getElementById('grad-start'),
  gradEnd: document.getElementById('grad-end'),
  applyGradient: document.getElementById('apply-gradient'),
  artistPfpsDiv: document.getElementById('artist-pfps'),
  createPlaylist: document.getElementById('create-playlist'),
  playlistsDiv: document.getElementById('playlists'),
  clearLibrary: document.getElementById('clear-library'),
};


const savedTheme = localStorage.getItem('theme') || 'light';
document.body.className = savedTheme;
if (savedTheme === 'gradient') {
  document.body.style.setProperty('--grad-start', localStorage.getItem('gradStart') || '#ff7e5f');
  document.body.style.setProperty('--grad-end', localStorage.getItem('gradEnd') || '#feb47b');
}


document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.tab).classList.add('active');
  });
});


els.uploadTracks.addEventListener('change', e => loadFiles(e.target.files));


els.uploadFolder.addEventListener('change', e => loadFiles(e.target.files, true)); 

function loadFiles(files, isFolder = false) {
  Array.from(files).forEach(file => {
    jsmediatags.read(file, {
      onSuccess: tag => {
        const metadata = {
          file,
          title: tag.tags.title || file.name,
          artist: tag.tags.artist || 'Unknown Artist',
          album: tag.tags.album || (isFolder ? 'CD/Album Upload' : 'Single'),
          type: tag.tags.album ? (tag.tags.track > 1 ? 'Album' : 'EP/Single') : 'Single',
          pfp: artistPfps[tag.tags.artist] || 'https://via.placeholder.com/150?text=Artist', 
        };
        tracks.push(metadata);
        updateLibrary();
        saveData();
      },
      onError: err => console.error('Metadata error', err),
    });
  });
  if (tracks.length > 0) playTrack(0);
}

function updateLibrary() {
  els.trackList.innerHTML = '';
  els.libraryGroups.innerHTML = '';


  const groups = tracks.reduce((acc, track, i) => {
    const key = `${track.artist} - ${track.album} (${track.type})`;
    if (!acc[key]) acc[key] = { tracks: [], artist: track.artist, album: track.album };
    acc[key].tracks.push({ name: track.title, index: i });
    return acc;
  }, {});

  Object.entries(groups).forEach(([key, group]) => {
    const div = document.createElement('div');
    div.className = 'album-group';
    div.innerHTML = `<h4>${key}</h4><ul></ul>`;
    group.tracks.forEach(t => {
      const li = document.createElement('li');
      li.textContent = t.name;
      li.onclick = () => playTrack(t.index);
      if (t.index === currentIndex) li.classList.add('active');
      div.querySelector('ul').appendChild(li);
    });
    els.libraryGroups.appendChild(div);
  });

 
  tracks.forEach((track, i) => {
    const li = document.createElement('li');
    li.textContent = track.title;
    li.onclick = () => playTrack(i);
    if (i === currentIndex) li.classList.add('active');
    els.trackList.appendChild(li);
  });

  updateArtistPfpsUI();
  updatePlaylistsUI();
}

function playTrack(index) {
  if (sound) sound.unload();
  currentIndex = index;
  const track = tracks[index];
  const src = URL.createObjectURL(track.file);

  sound = new Howl({
    src: [src],
    html5: true,
    volume: els.volume.value,
    onloaderror: (id, err) => console.error('Howl load error:', err),
    onplay: () => {
      isPlaying = true;
      els.playPause.textContent = '⏸ Pause';
      updateLibrary();
    },
    onpause: () => {
      isPlaying = false;
      els.playPause.textContent = '▶️ Play';
    },
    onend: () => nextTrack(),
  });

  sound.play();
  els.trackTitle.textContent = track.title;
  els.albumInfo.textContent = `Album: ${track.album} | Artist: ${track.artist}`;
  els.artistPfp.src = track.pfp;

 
  if ('mediaSession' in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: track.artist,
      album: track.album,
      artwork: [{ src: track.pfp, sizes: '512x512', type: 'image/png' }]
    });
  }
}

function nextTrack() {
  let next = currentIndex + 1;
  if (next >= tracks.length) next = 0;
  playTrack(next);
}

function prevTrack() {
  let prev = currentIndex - 1;
  if (prev < 0) prev = tracks.length - 1;
  playTrack(prev);
}


els.playPause.onclick = () => {
  if (!sound) return;
  isPlaying ? sound.pause() : sound.play();
};

els.prev.onclick = prevTrack;
els.next.onclick = nextTrack;

els.volume.oninput = e => {
  if (sound) sound.volume(e.target.value);
};


els.themeToggle.onclick = () => {
  let current = document.body.className;
  let next = current === 'light' ? 'dark' : 'light';
  document.body.className = next;
  localStorage.setItem('theme', next);
};


els.applyGradient.onclick = () => {
  const start = els.gradStart.value;
  const end = els.gradEnd.value;
  document.body.style.setProperty('--grad-start', start);
  document.body.style.setProperty('--grad-end', end);
  document.body.className = 'gradient';
  localStorage.setItem('theme', 'gradient');
  localStorage.setItem('gradStart', start);
  localStorage.setItem('gradEnd', end);
};

// Per-artist PFPs
function updateArtistPfpsUI() {
  els.artistPfpsDiv.innerHTML = '';
  Object.keys(artistPfps).forEach(artist => {
    const div = document.createElement('div');
    div.className = 'artist-pfp-item';
    div.innerHTML = `
      <label>${artist}: <input type="file" accept="image/*" data-artist="${artist}"></label>
    `;
    div.querySelector('input').addEventListener('change', e => {
      const file = e.target.files[0];
      if (file) {
        const url = URL.createObjectURL(file);
        artistPfps[artist] = url;
        tracks.forEach(t => { if (t.artist === artist) t.pfp = url; });
        saveData();
        updateLibrary();
        if (tracks[currentIndex]?.artist === artist) els.artistPfp.src = url;
      }
    });
    els.artistPfpsDiv.appendChild(div);
  });
}


els.createPlaylist.onclick = () => {
  const name = prompt('Playlist name?');
  if (name && !playlists[name]) {
    playlists[name] = [];
    saveData();
    updatePlaylistsUI();
  }
};

function updatePlaylistsUI() {
  els.playlistsDiv.innerHTML = '';
  Object.entries(playlists).forEach(([name, indices]) => {
    const div = document.createElement('div');
    div.innerHTML = `<h5>${name} <button data-name="${name}">Add Current Track</button> <button data-delete="${name}">Delete</button></h5><ul class="playlist"></ul>`;
    indices.forEach(idx => {
      const li = document.createElement('li');
      li.textContent = tracks[idx]?.title || 'Unknown';
      li.onclick = () => playTrack(idx);
      div.querySelector('ul').appendChild(li);
    });
    div.querySelector(`[data-name="${name}"]`).onclick = () => {
      if (!indices.includes(currentIndex)) {
        indices.push(currentIndex);
        saveData();
        updatePlaylistsUI();
      }
    };
    div.querySelector(`[data-delete="${name}"]`).onclick = () => {
      delete playlists[name];
      saveData();
      updatePlaylistsUI();
    };
    els.playlistsDiv.appendChild(div);
  });
}


els.clearLibrary.onclick = () => {
  tracks = [];
  playlists = {};
  artistPfps = {};
  saveData();
  updateLibrary();
  if (sound) sound.unload();
  els.trackTitle.textContent = 'No track selected';
  els.albumInfo.textContent = 'Album: N/A';
  els.artistPfp.src = 'https://via.placeholder.com/150?text=Artist';
};


function saveData() {
  localStorage.setItem('playlists', JSON.stringify(playlists));
  localStorage.setItem('artistPfps', JSON.stringify(artistPfps));

}


updateLibrary();
