
DIR=$(cd $(dirname ${BASH_SOURCE[0]}) && pwd)

rsync --archive --delete --checksum --progress --rsh "ssh -p 2204" \
    $DIR/ www-data@tice.sea.eseo.fr:/var/www/riscv/
