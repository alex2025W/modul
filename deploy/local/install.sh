sudo apt install -y curl && \
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg && \
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null && \
sudo apt update && \
sudo apt -y install gcc ca-certificates gnupg lsb-release git python2 xclip python2-dev && \
curl https://bootstrap.pypa.io/pip/2.7/get-pip.py -o get-pip.py && \
python2 get-pip.py && \
sudo ln -s /home/$USER/.local/bin/pip /usr/local/bin/pip && \
rm get-pip.py && \
pip install --user pipenv && \
sudo ln -s /home/$USER/.local/bin/pipenv /usr/local/bin/pipenv && \
sudo curl -L "https://github.com/docker/compose/releases/download/1.29.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose && \
sudo chmod +x /usr/local/bin/docker-compose && \
sudo apt -y install docker-ce docker-ce-cli containerd.io && \
sudo usermod -aG docker $USER && \
newgrp docker