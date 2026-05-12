#!/bin/bash
# Creates a self-extracting .run file from the extracted squashfs-root

if [ -z "$1" ] || [ -z "$2" ]; then
    echo "Usage: $0 <squashfs-root-dir> <output-file>"
    exit 1
fi

APPDIR="$1"
OUTPUT="$2"

# Create the archive
ARCHIVE=$(mktemp)
cd "$APPDIR"
tar czf "$ARCHIVE" .

# Create the self-extracting script
{
    echo '#!/bin/bash'
    echo 'set -e'
    echo 'HERE="$(dirname "$(readlink -f "$0")")"'
    echo 'TMPDIR="/tmp/gestion-ventas-$$"'
    echo 'mkdir -p "$TMPDIR"'
    echo 'ARCHIVE_LINE=$(awk "/^__ARCHIVE__/ {print NR+1; exit 0}" "$0")'
    echo 'tail -n+"$ARCHIVE_LINE" "$0" | tar xz -C "$TMPDIR"'
    echo '"$TMPDIR"/AppRun'
    echo 'rm -rf "$TMPDIR"'
    echo 'exit 0'
    echo '__ARCHIVE__'
    cat "$ARCHIVE"
} > "$OUTPUT"

chmod +x "$OUTPUT"
rm "$ARCHIVE"
echo "Created: $OUTPUT"
echo "Size: $(du -h "$OUTPUT" | cut -f1)"
