#!/usr/bin/env bash
# Evidence-only. For each stash commit, compare every file it carries against
# the authoritative commit and report anything present in the stash that is not
# represented on main.
set -u
MAIN=92d485a35d0af02676570820c31505d79e59a93f

for c in \
  5dd2966438a7afc0ba8fcaee3b112236d07bbdd1 \
  6fdcabdd9a7fff424e07b8e46664b0c1f3cf0e49 \
  c645761ead1edcf3dbbffdbc5aed9847016bf695 \
  9ee24c681d463259f60470d3b30479de47717022
do
  subject=$(git log -1 --format=%s "$c" | sed 's/^On [^:]*: //')
  echo "===== ${c:0:8}  $subject ====="

  files=$( { git diff --name-only "$c^1" "$c" 2>/dev/null;
             git ls-tree -r --name-only "$c^3" 2>/dev/null; } | sort -u )

  identical=0; differs=0; missing_on_main=0
  unique_lines_total=0
  report=""

  for f in $files; do
    sblob=$(git rev-parse "$c:$f" 2>/dev/null)
    mblob=$(git rev-parse "$MAIN:$f" 2>/dev/null)

    if [ -z "$mblob" ]; then
      missing_on_main=$((missing_on_main+1))
      report="$report\n    ABSENT-ON-MAIN  $f"
      continue
    fi

    if [ "$sblob" = "$mblob" ]; then
      identical=$((identical+1))
      continue
    fi

    differs=$((differs+1))
    # Lines present in the stash version but not in main's version.
    u=$(diff <(git show "$c:$f" 2>/dev/null) <(git show "$MAIN:$f" 2>/dev/null) \
         | grep -c '^<' )
    unique_lines_total=$((unique_lines_total+u))
    report="$report\n    DIFFERS ($u stash-only lines)  $f"
  done

  echo "  files carried      : $(echo "$files" | wc -w)"
  echo "  identical to main  : $identical"
  echo "  differ from main   : $differs"
  echo "  absent on main     : $missing_on_main"
  echo "  stash-only lines   : $unique_lines_total"
  [ -n "$report" ] && printf "%b\n" "$report"
  echo
done
