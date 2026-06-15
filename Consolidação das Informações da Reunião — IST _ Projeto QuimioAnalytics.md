# **Consolidação das Informações da Reunião — IST / Projeto QuimioAnalytics**

## **1\. Origem dos dados e fluxo atual utilizado pelo IST**

O laboratório utiliza o software Progenesis para geração e análise inicial dos dados.

Fluxo atual informado pela equipe:

1. Os dados são processados no Progenesis;  
2. Bibliotecas configuradas dentro do software são utilizadas para enriquecimento/análise;  
3. O próprio software gera automaticamente as planilhas de:  
   * identificação;  
   * abundância;  
4. A equipe apenas exporta/baixa os arquivos antes da etapa de análise biológica.

Importante:

* As colunas não são preenchidas manualmente;  
* As planilhas são exportadas automaticamente pelo software;  
* Algumas métricas adicionais (tags) são configuradas pela própria equipe dentro das bibliotecas do sistema.

---

# **2\. Explicação das principais colunas e métricas**

## **Compound**

Representa o sinal do composto analisado.

---

## **Neutral Mass**

(Massa Neutra)

Considerada irrelevante para classificação biológica no contexto atual.

Definição:  
Na química analítica, representa a massa da molécula em seu estado eletricamente neutro (sem carga), antes do processo de ionização utilizado na espectrometria de massa.

---

## **Retention Time (min)**

(Tempo de retenção)

É o tempo que uma substância leva para percorrer o sistema cromatográfico desde a injeção até a detecção.

Interpretação prática:  
Funciona como uma espécie de “identificador” da substância, pois diferentes compostos percorrem o sistema em velocidades diferentes.

---

## **Chromatographic Peak Width (min)**

(Largura do pico cromatográfico)

Indica a eficiência da separação cromatográfica.

Interpretação:

* Picos estreitos → melhor separação e maior eficiência;  
* Picos largos → menor eficiência e maior dispersão.

---

## **Anova (p)**

(p-value estatístico)

Mede a probabilidade de o resultado observado ocorrer por acaso.

Regra geral:

* p \<= 0,05:  
  Resultado estatisticamente significativo;  
  indica evidência de diferença/efeito real.  
* p \> 0,05:  
  Resultado não significativo;  
  não há evidências suficientes para afirmar diferença real.

---

## **q Value**

Refere-se ao quociente de reação.

Mede a relação entre concentrações de reagentes e produtos em determinado momento da reação química.

---

## **Max Fold Change**

Indica quantas vezes um valor aumentou ou diminuiu em relação a outro.

No contexto do projeto:  
Compara:

* Highest Mean  
  com  
* Lowest Mean

Interpretação:  
Valores maiores indicam maior diferença entre condições analisadas.

---

## **Isotope Distribution**

(Distribuição isotópica)

Representa a proporção natural dos diferentes isótopos presentes em um elemento químico.

---

## **Maximum Abundance**

(Abundância máxima)

Na espectrometria de massa:  
Representa o pico de maior intensidade do espectro.

Características:

* É ajustado para 100% de abundância;  
* Os demais picos são calculados proporcionalmente a ele.

---

## **Minimum CV%**

(Coeficiente de variação mínimo)

Utilizado para avaliar consistência experimental e variabilidade dos dados.

Interpretação:

* CV% alto:  
  maior dispersão e menor confiabilidade;  
* CV% baixo:  
  maior homogeneidade e melhor consistência amostral.

---

# **3\. Tags adicionadas pela equipe**

As tags são métricas/regras adicionais configuradas pela equipe através das bibliotecas do Progenesis.

## **Tags identificadas**

### **Branco**

Indica presença de espaço em branco na amostra.

---

### **Abund \> 500**

Abundância acima de 500\.

---

### **Abund \> 1000**

Abundância acima de 1000\.

---

### **Abund \> 5000**

Abundância acima de 5000\.

---

### **Abund \> 10000**

Abundância acima de 10000\.

---

### **Anova p-value \<= 0.05**

Indica significância estatística.

---

### **Max Fold Change \>= 2**

Considera-se compostos com Fold Change maior ou igual a 2\.

---

### **Not Fragmented**

Indica compostos que não sofreram fragmentação.

---

# **4\. Informações importantes para o sistema de ordenação biológica**

## **Nova regra de priorização definida na reunião**

A ordenação biológica deverá considerar a seguinte sequência de prioridade:

1. fragmentation\_score  
2. score  
3. isotope\_similarity  
4. mass\_error  
5. fórmula

---

# **5\. Ajustes necessários no processo de validação**

Foi definido que o campo:

* score

também deve ser incluído na validação da ordenação biológica.

Assim, os campos utilizados passam a incluir:

* feature\_group  
* original\_id  
* fragmentation\_score  
* score  
* isotope\_similarity  
* mass\_error  
* fórmula  
* rank\_group  
* is\_tied

---

# **6\. Conclusões principais da reunião**

## **Confirmado**

* O Progenesis gera automaticamente os dados;  
* As planilhas são exportadas diretamente do software;  
* A equipe não realiza preenchimento manual das colunas principais;  
* Existem regras adicionais configuradas por bibliotecas internas;  
* A ordenação biológica deve priorizar métricas específicas;  
* O score precisa ser incorporado à validação.

---

# **7\. Impactos diretos no projeto QuimioAnalytics**

## **Necessário atualizar**

* Regras de ranking;  
* Documentação técnica;  
* Documentação biológica;  
* Pipeline ETL;  
* Processo de validação;  
* Critérios de interpretação dos candidatos;  
* Estrutura da planilha de revisão.

# **Estrutura Final Esperada do Projeto QuimioAnalytics**

## **Objetivo Final**

O resultado final do sistema será um dashboard interativo contendo os compostos classificados biologicamente, enriquecidos com informações químicas obtidas através de APIs externas e regras de ordenação validadas pelo IST.

O sistema atuará como uma camada de apoio à decisão científica, organizando automaticamente os candidatos mais relevantes para análise humana.

---

# **Estrutura Final da Saída**

## **Colunas finais esperadas**

| Coluna | Descrição |
| ----- | ----- |
| Composto | Nome do composto identificado |
| Composto ID | Identificador único do composto |
| Modo de aquisição | Método/modo de aquisição do espectro |
| Score | Score geral de identificação/priorização |
| Fragmentação | Métrica de fragmentação utilizada na ordenação |
| Abund. relativa | Valor relativo de abundância do composto |
| Amostra mais abundante | Amostra onde o composto apresentou maior abundância |
| Descrição | Descrição química/biológica do composto |
| Classe geral | Classe química principal |
| Subclasse | Subcategoria química mais específica |

---

# **Origem das Informações**

## **Dados internos (planilhas exportadas do Progenesis)**

As seguintes informações serão obtidas diretamente das planilhas exportadas pelo Progenesis:

* Compound  
* Compound ID  
* Acquisition Mode  
* Score  
* Fragmentation Score  
* Abundância  
* Informações das amostras  
* Métricas estatísticas  
* Métricas isotópicas

---

# **Dados enriquecidos por APIs externas**

As seguintes informações serão buscadas automaticamente em bases químicas externas:

| Informação | Fonte provável |
| ----- | ----- |
| Nome padronizado do composto | APIs químicas |
| Descrição química | PubChem / ChEBI |
| Classe geral | ClassyFire / PubChem |
| Subclasse | ClassyFire |
| Fórmula molecular complementar | APIs químicas |
| Metadados biológicos | Bases metabolômicas |

---

# **Principais APIs/Bases previstas**

## **Bases químicas principais**

* PubChem  
* ChEBI  
* ClassyFire

---

# **Fluxo macro do sistema**

## **1\. Entrada**

Recebimento das planilhas exportadas do Progenesis:

* identificação;  
* abundância.

---

## **2\. ETL e limpeza**

Tratamento dos dados:

* remoção de inconsistências;  
* normalização;  
* padronização;  
* integração das tabelas.

---

## **3\. Ranking biológico**

Aplicação da lógica validada pelo IST:

Sequência de priorização:

1. fragmentation\_score  
2. score  
3. isotope\_similarity  
4. mass\_error  
5. formula

---

## **4\. Enriquecimento químico**

Consulta automática em APIs externas para obter:

* descrição;  
* classe química;  
* subclasse;  
* metadados complementares.

---

## **5\. Consolidação final**

Geração da saída final:

* Excel;  
* CSV;  
* Dashboard;  
* relatórios analíticos.

---

# **Objetivo científico da saída**

A saída final deve permitir que pesquisadores:

* identifiquem rapidamente compostos prioritários;  
* comparem abundâncias entre amostras;  
* interpretem relevância biológica;  
* visualizem classificação química;  
* reduzam análise manual repetitiva;  
* acelerem validação experimental.

---

# **Características esperadas do dashboard**

## **Funcionalidades previstas**

* filtros por classe química;  
* filtros por abundância;  
* busca por composto;  
* visualização de ranking;  
* destaque de candidatos prioritários;  
* análise comparativa entre amostras;  
* exportação para Excel/CSV;  
* indicadores estatísticos;  
* rastreabilidade da origem dos dados.

---

# **Resultado esperado do projeto**

O QuimioAnalytics deixará de ser apenas um processo manual de revisão de planilhas e passará a funcionar como uma plataforma de apoio científico para priorização e interpretação metabolômica baseada em:

* dados laboratoriais;  
* regras biológicas;  
* classificação química automatizada;  
* enriquecimento externo;  
* validação humana especializada.

