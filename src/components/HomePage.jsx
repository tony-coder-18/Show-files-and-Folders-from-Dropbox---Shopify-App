import {
  Card,
  Page,
  Layout,
  TextContainer,
  Image,
  Stack,
  Link,
  Heading,
  Button,
  ResourceList,
  ResourceItem,
} from "@shopify/polaris";
import { getSessionToken } from "@shopify/app-bridge-utils";
import { useAppBridge } from "@shopify/app-bridge-react";
import { useEffect } from "react";
import { useState } from "react";


import trophyImgUrl from "../assets/home-trophy.png";

import { ProductsCard } from "./ProductsCard";
import { FoldersList } from "./FoldersList";


//import { DropboxChooser } from "react-dropbox-chooser";

export function HomePage() {

  const [newFolder, setNewFolder] = useState("");

  const [folderRows, setFolderRows]  = useState([]);

  const [currentThemeNum, setCurrentThemeNum] = useState(0);

  const addFolders = ()=>{
    setFolderRows(olderFolderRow=>[...olderFolderRow, newFolder]);
  };

  //For Triggering addFolders function ONLY after changing newFolder
  useEffect(()=>{
    console.log("Here's the ID: " + newFolder.id);
    addFolders();
  }, [newFolder]);

  /*useEffect(()=>{
    //fetch("/app/add-theme-section");
    
    fetch("/admin/api/2022-04/themes.json")
      .then(res => res.json())
      .then(
        (result) => {
          
            console.log(element)
          
        },
        // Nota: es importante manejar errores aquí y no en 
        // un bloque catch() para que no interceptemos errores
        // de errores reales en los componentes.
        (error) => {
          console.log(error)
        }
      )
      
  }, [folderRows]);*/

  const app = useAppBridge();

  const postNewSection = async (themeNum) => {
    try {
      const token = await getSessionToken(app);

      let bodyPost = {
        tnumber: "themeNum", 
        Id:1
      };
      
      const response = await fetch('/add-theme-section',{
        method: 'POST',
        body: JSON.stringify(bodyPost),
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-type": "application/json"
        },
      })
      
      const result = await response.text();

      console.log('result is: ', result);

      if (!response.ok) {
        throw new Error(`Error! status: ${response.status}`);
      }

    } catch (error) {
      console.log(error)
    }
  };

  const getThemes = async () => {
    try {
      const token = await getSessionToken(app);
      console.log(token);
      const response = await fetch('/add-theme-section',{
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      const result = await response.json();

      console.log('result is: ', result);

      setCurrentThemeNum(result.id);

      if (!response.ok) {
        throw new Error(`Error! status: ${response.status}`);
      }

    } catch (error) {
      console.log(error)
    } 
  };

  /*useEffect(()=>{
    console.log(currentThemeNum);
    postNewSection(currentThemeNum);
  }, [currentThemeNum])
  */

  return (
    <Page fullWidth>
      <Layout>
        <Layout.Section>
          <Heading>Connect to Dropbox Easily</Heading>
          <Button
          primary
          onClick={()=>{

            Dropbox.choose({
            success: function(files) {
                setNewFolder({id:Math.random()*10, name:files[0].name, icon:files[0].icon});
                getThemes();
              },
              folderselect: true
            });
          }}>
            Choose a Folder from Dropbox
          </Button>
          <button onClick={getThemes} >
            Prueba 2
          </button>
          <button onClick={postNewSection}>
            prueba post
          </button>
        </Layout.Section>
         
        <Layout.Section>
          <Card sectioned>
            <ResourceList
              items={folderRows}
              renderItem={(folder, index)=>{
                if (!folder) {
                  return
                }
                return (
                  <ResourceItem key={folder.id}>
                    <Stack>
                      <Stack.Item fill>
                        <Heading>{folder.name}</Heading>
                      </Stack.Item>
                      <Stack.Item>
                        <Button destructive>
                          Delete
                        </Button>
                      </Stack.Item>
                      <Stack.Item>
                        <Button primary>
                          Add to Theme
                        </Button>
                      </Stack.Item>

                    </Stack>
                  </ResourceItem>
                )
              }}
            >

              {/*folderRows.map((folder, index)=>{
                if (!folder) {
                  return
                }
                return (
                  <ResourceItem key={folder.id}>
                    <Stack>
                      <Stack.Item fill>
                        <Heading>{folder.name}</Heading>
                      </Stack.Item>
                      <Stack.Item>
                        <Button destructive>
                          Delete
                        </Button>
                      </Stack.Item>
                      <Stack.Item>
                        <Button primary>
                          Add to Theme
                        </Button>
                      </Stack.Item>

                    </Stack>
                  </ResourceItem>
                )
              })*/}
            
            </ResourceList>
          </Card>
          <Button
          primary
          onClick={()=>{}}>
            Fetch Test
          </Button>

        </Layout.Section>

      </Layout>
    </Page>
  );
}