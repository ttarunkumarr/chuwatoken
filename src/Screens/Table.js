import { getDownloadURL, listAll, ref, getMetadata } from "firebase/storage";
import React, { useEffect, useState } from "react";
import { Redirect, useLocation } from "react-router-dom";
import { db, storage } from "../config";
import "./Table.css";
import Navbar from "../Components/Navbar";
import Skill from "../Components/skills";
import { getDoc, doc } from "firebase/firestore";
function Table() {
  const location = useLocation();
  const [files, setFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [Flag, setFlag] = useState(false);
  const [subfolderNames, setSubfolderNames] = useState([]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get("token");
    if (token) {
      location.state = token;
    } else {
      setFlag(true);
      setIsLoading(false);
      console.log("Token not found");
    }
    if (location.state) {
      fetchFiles();
    }
    async function fetchFiles() {
      try {
        const docRef = doc(db, "tokens", token);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          console.log("Document data:", docSnap.data());
          const { tech, exp } = docSnap.data();

          if (exp === "") {
            console.log(tech);
            const subfolderNames = await fetchSubfolderData(tech);
            console.log(subfolderNames);
            const downloadURLsPromises = [];
            for (const subfolderName of subfolderNames) {
              const subfolderStorageRef = ref(
                storage,
                `files/${tech}/${subfolderName}`
              );
              const { items } = await listAll(subfolderStorageRef);

              downloadURLsPromises.push(
                ...items.map(async (item) => {
                  const downloadURL = await getDownloadURL(item);
                  const metadata = await getMetadata(item);

                  const uploadTime = metadata.timeCreated;
                  const skill = metadata.customMetadata;
                  const experience = subfolderName;
                  console.log(skill);
                  const date = new Date(uploadTime.replace("Z", ""));
                  const daysAgo = Math.round((new Date() - date) / 86400000);
                  return {
                    name: item.name,
                    downloadURL,
                    uploadTime: `${daysAgo} days ago`,
                    skill,
                    experience,
                  };
                })
              );
            }

            const downloadURLs = await Promise.all(downloadURLsPromises);
            setFiles(downloadURLs);
            setIsLoading(false);
          } else {
            const storageRef = ref(storage, `files/${tech}/${exp}`);
            const { items } = await listAll(storageRef);

            const downloadURLsPromises = items.map(async (item) => {
              const downloadURL = await getDownloadURL(item);
              const metadata = await getMetadata(item);
              const experience = exp;
              const uploadTime = metadata.timeCreated;
              const skill = metadata.customMetadata;
              console.log(skill);
              const date = new Date(uploadTime.replace("Z", ""));
              const daysAgo = Math.round((new Date() - date) / 86400000);
              return {
                name: item.name,
                downloadURL,
                uploadTime: `${daysAgo} days ago`,
                skill,
                experience,
              };
            });

            const downloadURLs = await Promise.all(downloadURLsPromises);
            setFiles(downloadURLs);
            setIsLoading(false);
          }
        } else {
          setFlag(true);
          setIsLoading(false);
          console.log("No such document!");
        }
      } catch (error) {
        console.error(error);
        setError("Error fetching files");
        setIsLoading(false);
      }
    }
    async function fetchSubfolderData(folderName) {
      try {
        const storageRef = ref(storage, `files/${folderName}`);
        const { prefixes } = await listAll(storageRef);

        const subfolderNames = prefixes.map((prefix) => prefix.name);
        return subfolderNames;
      } catch (error) {
        console.error(error);
       
        return [];
      }
    }
  }, [location.state]);

  if (isLoading) {
    return (
      <div className="loader">
        <div className="spinner"></div>
      </div>
    );
  }

  if (error) {
    return <div>{error}</div>;
  }

  return (
    <div className="Main-table">
      <Navbar
        backgroundColor="#333"
        textColor="#fff"
        buttons={[]}
        onClick={() => {}}
      />
      {!Flag ? (
        <div className="wrapper-table">
          <div className="Table-con">
            <table>
              <thead>
                <tr>
                  <th>S.no</th>
                  <th>Name</th>
                  <th>Developer Skills</th>
                  <th>Experience</th>

                  <th>Resume</th>
                </tr>
              </thead>
              <tbody>
                {files.map((file, index) => (
                  <tr key={file.name}>
                    <td>{index + 1}</td>
                    <td>{file.skill?.name}</td>
                    <td>
                      <Skill skill={file.skill?.skills} />
                    </td>
                    <td>
                      {file.experience > 1
                        ? file.experience + " Years"
                        : file.experience + " Year"}{" "}
                    </td>

                    <td>
                      <a
                        href={file.downloadURL}
                        download={file.name}
                        className="download-btn"
                      >
                        Download <span className="pdf-icon"></span>
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="eror">
          <h1>Error Token Invalid or Expired</h1>
        </div>
      )}
    </div>
  );
}

export default Table;
