Coloque aqui o arquivo mascot.webm (vídeo do mascote grafitando, com canal alpha/transparência).
Sem esse arquivo, o telão usa automaticamente um splash de tinta em CSS como fallback.

Dica para gerar o webm com alpha a partir do After Effects/Premiere:
ffmpeg -i mascote.mov -c:v libvpx-vp9 -pix_fmt yuva420p -auto-alt-ref 0 mascot.webm
