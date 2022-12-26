#!/bin/bash

local_build_dir="/Users/oluckyman/Projects/timeline-build"
release_build_dir="/Users/oluckyman/Projects/modulint/timeline"
google_dir="/Users/oluckyman/Google Drive/Timeline/timeline-"
src_dir="/Users/oluckyman/Projects/timeline"

check_release() {
    repo_version=$(get_repo_version)
    config_version=$(get_config_version)
    # api_url=$(get_api_url)

    # echo -e "API url is $(colorize $api_url)"
    # if [ $release = "pub" ]
    # then
    #     while true; do
    #         read -p "Is it correct? [y]es/[n]o: " answer
    #         case $answer in
    #             [Yy]* | "" ) break;;
    #             [Nn]* ) exit; break;;
    #             * ) echo "Please answer yes or no.";;
    #         esac
    #     done
    # fi

    echo -e "Last tagged version is $(colorize $repo_version) and you are building $(colorize $config_version)"
    if [ $release = "pub" ]
    then
        while true; do
            read -p "Is it correct? [y]es/[n]o: " answer
            case $answer in
                [Yy]* | "" ) break;;
                [Nn]* ) exit; break;;
                * ) echo "Please answer yes or no.";;
            esac
        done
    fi
}

r_make() {
    echo "========== compiling the build =========="
    r.js -o "$src_dir"/js/app.build.js
    mv "$local_build_dir/build.txt" "$local_build_dir/build-$config_version.txt"
    echo "========== compilation done =========="
}

git_update() {
    if [ $release = "pub" ]
    then
        echo "========== force push from the local repo to the origin =========="
        cd "$src_dir"
        git push --force
        git push --tags --force
        echo "========== pushing done =========="
        echo "========== sync timeline-src with the origin =========="
        cd "$google_dir""src"
        git fetch --all
        git reset --hard origin/master
        echo "========== pulling done =========="
    fi
}

# wait_directory() {
#     echo "========== awaiting directory =========="
#     while [ "$(ls -B "$google_release_dir")" != "Icon\015" -a "$(ls "$google_release_dir")" ]
#     do
#         echo "awaiting $google_release_dir to get empty"
#         sleep 5
#     done
#     echo "========== $google_release_dir is empty =========="
# }

copy() {
    echo "========== copy =========="
    echo "clear release dir: rm -rd $release_build_dir/*"
    rm -rd "$release_build_dir/"
    mkdir "$release_build_dir"
    echo "cp $local_build_dir/* -> $release_build_dir"
    cp -r "$local_build_dir"/* "$release_build_dir"
    echo "========== copied =========="
}

get_repo_version() {
    cd "$src_dir"
    echo "$(git for-each-ref --format '%(tag)' refs/tags --sort=taggerdate | grep 'v*' | tail -n 1)"
    # echo "$(git tag -l "v*" | tail -n 1)"
}

get_config_version() {
    cd "$src_dir"
    echo "$(grep "appVersion:" js/global.js | sed -e "s/.*'\(v\([^']\)*\).*/\1/")"
}

get_api_url() {
    cd "$src_dir"
    echo "$(grep "^\s*this.config.api_url" js/global.js | sed -e "s/.*= \"\(.*\)\";/\1/")"
}

colorize() {
    echo "\033[1;33m$1\033[0m"
}

# Select release
if [ $# -eq 1 ] ; then
    case $1 in
        [Dd]* | "" ) release="dev"; ;;
        [Pp]* ) release="pub"; ;;
    esac
fi
if [ -z $release ] ; then
    echo "Please pass [d]ev or [p]ub argument"
    exit 0
fi

check_release
git_update
r_make
copy
