#include <cstdint>
#include <fstream>
#include <iostream>
#include <string>
#include <vector>
struct Face { uint8_t count; uint32_t index[3]; } __attribute__((packed));
struct DSU { std::vector<uint32_t> p,sz; DSU(uint32_t n):p(n),sz(n,1){for(uint32_t i=0;i<n;i++)p[i]=i;} uint32_t find(uint32_t a){while(p[a]!=a){p[a]=p[p[a]];a=p[a];}return a;} void join(uint32_t a,uint32_t b){a=find(a);b=find(b);if(a==b)return;if(sz[a]<sz[b])std::swap(a,b);p[b]=a;sz[a]+=sz[b];}};
int main(int c,char**v){if(c!=5)return 2; const uint64_t header=std::stoull(v[2]);const uint32_t nv=std::stoul(v[3]);const uint32_t nf=std::stoul(v[4]);std::ifstream in(v[1],std::ios::binary);if(!in)return 3;in.seekg(header+uint64_t(nv)*12);DSU d(nv);Face f;for(uint32_t i=0;i<nf;i++){in.read((char*)&f,13);if(!in||f.count!=3)return 4;d.join(f.index[0],f.index[1]);d.join(f.index[1],f.index[2]);d.join(f.index[2],f.index[0]);}std::ofstream out(std::string(v[1])+".labels.bin",std::ios::binary);for(uint32_t i=0;i<nv;i++){uint32_t x=d.find(i);out.write((char*)&x,4);}return out?0:5;}
